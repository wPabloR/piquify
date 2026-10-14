import { createClient } from "@/lib/supabase/server";
import { getSql, hasDatabaseUrl } from "@/infrastructure/db";
import { syncDuePiques } from "@/application/sync-due-piques";
import { ensureAccount } from "@/application/ensure-account";
import { listInvitableFriends as listInvitableFriendsUseCase } from "@/application/list-invitable-friends";
import { searchPeople as searchPeopleUseCase } from "@/application/search-people";
import { searchPlaygrounds as searchPlaygroundsUseCase } from "@/application/search-playgrounds";
import { withUnitOfWork } from "@/infrastructure/postgres-stores";
import { canCastVote } from "@/domain/access";
import type { PiqueStatus } from "@/domain/models";
import {
  activityHref,
  historyLabel,
  ledgerMovementLabel,
  parseLedgerKind,
  optionShare,
  type NotificationKind,
} from "@/domain/presentation";
import type {
  AccessItem,
  ActivityItem,
  FriendListItem,
  HeadToHeadView,
  LedgerMovementView,
  PiqueView,
  PlaygroundEventView,
  PlaygroundSummary,
  ProfileStats,
  SearchPersonView,
  SearchPlaygroundView,
  Viewer,
} from "@/domain/views";

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

export interface AccountHints {
  name?: string;
  handle?: string;
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!data || typeof userId !== "string" || userId.length === 0) return null;
  const meta = record((data.claims as Record<string, unknown>).user_metadata);
  return getViewerFor(userId, {
    name: meta ? optionalText(meta, "display_name") : undefined,
    handle: meta ? optionalText(meta, "handle") : undefined,
  });
}

export async function getViewerFor(userId: string, hints: AccountHints = {}): Promise<Viewer | null> {
  if (!hasDatabaseUrl()) return null;
  const account = await withUnitOfWork((uow) =>
    ensureAccount(uow, { actorId: userId, name: hints.name, handle: hints.handle }),
  );
  await syncDuePiques();
  const sql = getSql();
  const [{ points, notifications }, stats] = await Promise.all([
    loadBalanceAndUnread(sql, userId),
    loadStats(sql, userId),
  ]);
  return {
    id: userId,
    name: account.name,
    handle: account.handle,
    friendCode: account.friendCode,
    points,
    notifications,
    streak: stats.streak,
    accuracy: stats.accuracy,
  };
}

export async function listPlaygrounds(userId: string): Promise<PlaygroundSummary[]> {
  const sql = getSql();
  const playgrounds = await sql<{
    id: string;
    name: string;
    tagline: string;
    emoji: string;
    admin_id: string;
    public_code: string;
    updated_at: Date;
  }[]>`
    select p.id, p.name, p.tagline, p.emoji, p.admin_id, p.public_code, p.updated_at
    from public.playgrounds p
    join public.playground_members mine
      on mine.playground_id = p.id and mine.user_id = ${userId}::uuid
    order by p.updated_at desc
  `;
  if (playgrounds.length === 0) return [];
  const ids = playgrounds.map((item) => item.id);
  const [members, piques, participations, ledger, unread] = await Promise.all([
    sql<{ playground_id: string; user_id: string; role: string; display_name: string }[]>`
      select m.playground_id, m.user_id, m.role, pr.display_name
      from public.playground_members m
      join public.profiles pr on pr.id = m.user_id
      where m.playground_id in ${sql(ids)}
    `,
    sql<{ id: string; playground_id: string; status: string; stake: number }[]>`
      select id, playground_id, status, stake from public.piques where playground_id in ${sql(ids)}
    `,
    sql<{ pique_id: string; user_id: string }[]>`
      select pa.pique_id, pa.user_id
      from public.participations pa
      join public.piques q on q.id = pa.pique_id
      where q.playground_id in ${sql(ids)}
    `,
    sql<{ playground_id: string; user_id: string; amount: number }[]>`
      select playground_id, user_id, amount
      from public.ledger_entries
      where playground_id in ${sql(ids)}
    `,
    sql<{ playground_id: string }[]>`
      select playground_id
      from public.notifications
      where user_id = ${userId}::uuid and read_at is null and playground_id in ${sql(ids)}
    `,
  ]);

  const participantsByPique = new Map<string, number>();
  for (const row of participations) {
    participantsByPique.set(row.pique_id, (participantsByPique.get(row.pique_id) ?? 0) + 1);
  }

  return playgrounds.map((playground) => {
    const groupMembers = members.filter((member) => member.playground_id === playground.id);
    const scores = new Map<string, number>();
    for (const entry of ledger) {
      if (entry.playground_id !== playground.id) continue;
      scores.set(entry.user_id, (scores.get(entry.user_id) ?? 0) + integer(entry.amount));
    }
    const ranked = [...groupMembers].sort(
      (left, right) => (scores.get(right.user_id) ?? 0) - (scores.get(left.user_id) ?? 0),
    );
    const groupPiques = piques.filter((pique) => pique.playground_id === playground.id);
    const active = groupPiques.filter((pique) =>
      ["open", "locked", "pending_result"].includes(pique.status),
    );
    return {
      id: playground.id,
      name: playground.name,
      tagline: playground.tagline,
      emoji: playground.emoji,
      openPiques: groupPiques.filter((pique) => pique.status === "open").length,
      myRank: Math.max(1, ranked.findIndex((member) => member.user_id === userId) + 1),
      memberCount: groupMembers.length,
      pot: active.reduce(
        (total, pique) => total + integer(pique.stake) * (participantsByPique.get(pique.id) ?? 0),
        0,
      ),
      lastActivity: relativeTime(iso(playground.updated_at)),
      unread: unread.filter((item) => item.playground_id === playground.id).length,
      members: ranked.map((member) => ({
        id: member.user_id,
        name: member.display_name,
        points: scores.get(member.user_id) ?? 0,
      })),
      publicCode: playground.public_code,
      isAdmin: playground.admin_id === userId,
    };
  });
}

export async function listFeaturedPiques(playgroundId: string, userId: string) {
  const piques = await listPiques(playgroundId, userId);
  return piques.filter((pique) => pique.status === "open").slice(0, 2);
}

export async function listPiques(playgroundId: string, userId: string): Promise<PiqueView[]> {
  const sql = getSql();
  const [member] = await sql<{ admin_id: string }[]>`
    select p.admin_id
    from public.playgrounds p
    join public.playground_members m
      on m.playground_id = p.id and m.user_id = ${userId}::uuid
    where p.id = ${playgroundId}::uuid
  `;
  if (!member) return [];
  const isAdmin = member.admin_id === userId;

  const [piques, options, participations, proposals, winners, votes] = await Promise.all([
    sql<{
      id: string;
      question: string;
      detail: string | null;
      status: PiqueStatus;
      stake: number;
      closes_at: Date;
      created_by: string;
      creator_name: string | null;
    }[]>`
      select q.id, q.question, q.detail, q.status, q.stake, q.closes_at, q.created_by, pr.display_name as creator_name
      from public.piques q
      left join public.profiles pr on pr.id = q.created_by
      where q.playground_id = ${playgroundId}::uuid
      order by q.created_at desc
    `,
    sql<{ id: string; pique_id: string; label: string; position: number }[]>`
      select o.id, o.pique_id, o.label, o.position
      from public.pique_options o
      join public.piques q on q.id = o.pique_id
      where q.playground_id = ${playgroundId}::uuid
    `,
    sql<{ pique_id: string; user_id: string; option_id: string; display_name: string }[]>`
      select pa.pique_id, pa.user_id, pa.option_id, pr.display_name
      from public.participations pa
      join public.piques q on q.id = pa.pique_id
      join public.profiles pr on pr.id = pa.user_id
      where q.playground_id = ${playgroundId}::uuid
    `,
    sql<{ pique_id: string; option_id: string; voting_ends_at: Date; proposed_by: string }[]>`
      select rp.pique_id, rp.option_id, rp.voting_ends_at, rp.proposed_by
      from public.result_proposals rp
      join public.piques q on q.id = rp.pique_id
      where q.playground_id = ${playgroundId}::uuid
    `,
    sql<{ pique_id: string; option_id: string }[]>`
      select pw.pique_id, pw.option_id
      from public.pique_winners pw
      join public.piques q on q.id = pw.pique_id
      where q.playground_id = ${playgroundId}::uuid
    `,
    sql<{ pique_id: string; user_id: string }[]>`
      select rv.pique_id, rv.user_id
      from public.result_votes rv
      join public.piques q on q.id = rv.pique_id
      where q.playground_id = ${playgroundId}::uuid
    `,
  ]);

  const now = Date.now();
  return piques.map((pique) => {
    const piqueOptions = options
      .filter((option) => option.pique_id === pique.id)
      .sort((left, right) => integer(left.position) - integer(right.position));
    const backs = participations.filter((entry) => entry.pique_id === pique.id);
    const mine = backs.find((entry) => entry.user_id === userId);
    const proposal = proposals.find((entry) => entry.pique_id === pique.id);
    const winning = winners.filter((entry) => entry.pique_id === pique.id).map((entry) => entry.option_id);
    const closesAt = pique.closes_at.getTime();
    const proposedOption = proposal
      ? piqueOptions.find((option) => option.id === proposal.option_id)
      : undefined;

    return {
      id: pique.id,
      question: pique.question,
      detail: pique.detail,
      status: pique.status,
      closesLabel: closesLabel(pique.status, iso(pique.closes_at), proposal ? iso(proposal.voting_ends_at) : null),
      createdBy: pique.creator_name ?? "Alguien",
      stake: integer(pique.stake),
      hot: pique.status === "open" && closesAt - now < 6 * 60 * 60 * 1000 && closesAt > now,
      options: piqueOptions.map((option) => {
        const backers = backs
          .filter((entry) => entry.option_id === option.id)
          .map((entry) => entry.display_name);
        return {
          id: option.id,
          label: option.label,
          backers: pique.status === "resolved" ? backers : [],
          share: optionShare(pique.status, backers.length, backs.length),
        };
      }),
      myOptionId: mine ? mine.option_id : null,
      winningOptionIds: winning,
      canLeave: pique.status === "open" && Boolean(mine) && closesAt > now,
      canPropose: isAdmin && pique.status === "locked",
      canVote: proposal
        ? canCastVote({
            status: pique.status,
            isParticipant: Boolean(mine),
            isProposer: proposal.proposed_by === userId,
            alreadyVoted: votes.some((vote) => vote.pique_id === pique.id && vote.user_id === userId),
            votingEndsAt: proposal.voting_ends_at,
            now: new Date(now),
          }).ok
        : false,
      participantCount: backs.length,
      proposalLabel: proposedOption ? proposedOption.label : null,
    };
  });
}

export async function searchPlaygrounds(query: string): Promise<SearchPlaygroundView[]> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (typeof userId !== "string" || userId.length === 0) return [];
  return withUnitOfWork((uow) => searchPlaygroundsUseCase(uow, { actorId: userId, query }));
}

export async function searchPeople(query: string): Promise<SearchPersonView[]> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (typeof userId !== "string" || userId.length === 0) return [];
  return withUnitOfWork((uow) => searchPeopleUseCase(uow, { actorId: userId, query }));
}

export async function listFriends(userId: string): Promise<FriendListItem[]> {
  return withUnitOfWork((uow) => uow.listFriends(userId));
}

export async function listInvitableFriends(
  userId: string,
  playgroundId: string,
): Promise<FriendListItem[]> {
  return withUnitOfWork((uow) =>
    listInvitableFriendsUseCase(uow, { actorId: userId, playgroundId }),
  );
}

export async function getProfileByFriendCode(code: string) {
  return withUnitOfWork((uow) => uow.profileByFriendCode(code));
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const sql = getSql();
  return loadStats(sql, userId);
}

export async function listLedgerMovements(
  userId: string,
  limit = 50,
): Promise<LedgerMovementView[]> {
  const sql = getSql();
  const take = Math.min(Math.max(1, Math.trunc(limit)), 50);
  const rows = await sql<
    {
      id: string;
      kind: string;
      amount: number;
      playground_id: string | null;
      pique_id: string | null;
      playground_name: string | null;
      question: string | null;
      created_at: Date;
    }[]
  >`
    select
      l.id,
      l.kind,
      l.amount,
      l.playground_id,
      l.pique_id,
      l.created_at,
      pg.name as playground_name,
      q.question
    from public.ledger_entries l
    left join public.playgrounds pg on pg.id = l.playground_id
    left join public.piques q on q.id = l.pique_id
    where l.user_id = ${userId}::uuid
    order by l.created_at desc, l.id desc
    limit ${take}
  `;
  return rows.map((row) => {
    const kind = parseLedgerKind(row.kind);
    return {
      id: row.id,
      kind,
      amount: integer(row.amount),
      label: ledgerMovementLabel(kind),
      playgroundName: row.playground_name,
      question: row.question,
      href:
        row.playground_id && row.pique_id
          ? `/playgrounds/${row.playground_id}#pique-${row.pique_id}`
          : row.playground_id
            ? `/playgrounds/${row.playground_id}`
            : null,
      when: relativeTime(iso(row.created_at)),
    };
  });
}

export async function getHeadToHead(actorId: string, otherId: string): Promise<HeadToHeadView | null> {
  const isFriend = await withUnitOfWork((uow) => uow.friendshipExists(actorId, otherId));
  if (!isFriend) return null;
  const sql = getSql();
  const [friend] = await sql<{ id: string; display_name: string; handle: string }[]>`
    select id, display_name, handle from public.profiles where id = ${otherId}::uuid
  `;
  if (!friend) return null;
  const [sharedPlaygrounds, piques, nets] = await Promise.all([
    sql<{ id: string; name: string; emoji: string }[]>`
      select pg.id, pg.name, pg.emoji
      from public.playgrounds pg
      where exists (
        select 1 from public.playground_members a
        where a.playground_id = pg.id and a.user_id = ${actorId}::uuid
      )
      and exists (
        select 1 from public.playground_members b
        where b.playground_id = pg.id and b.user_id = ${otherId}::uuid
      )
      order by pg.name
    `,
    sql<
      {
        id: string;
        playground_id: string;
        playground_name: string;
        question: string;
        my_win: boolean;
        their_win: boolean;
      }[]
    >`
      select
        q.id,
        q.playground_id,
        pg.name as playground_name,
        q.question,
        exists (
          select 1 from public.pique_winners w
          where w.pique_id = q.id and w.option_id = pa.option_id
        ) as my_win,
        exists (
          select 1 from public.pique_winners w
          where w.pique_id = q.id and w.option_id = pb.option_id
        ) as their_win
      from public.piques q
      join public.playgrounds pg on pg.id = q.playground_id
      join public.participations pa on pa.pique_id = q.id and pa.user_id = ${actorId}::uuid
      join public.participations pb on pb.pique_id = q.id and pb.user_id = ${otherId}::uuid
      where q.status = 'resolved'
      order by q.resolved_at desc nulls last
    `,
    sql<{ user_id: string; total: number }[]>`
      select l.user_id, coalesce(sum(l.amount), 0)::int as total
      from public.ledger_entries l
      where (l.user_id = ${actorId}::uuid or l.user_id = ${otherId}::uuid)
        and l.kind in ('stake_hold', 'stake_refund', 'payout')
        and l.pique_id in (
          select pa.pique_id
          from public.participations pa
          join public.participations pb on pb.pique_id = pa.pique_id and pb.user_id = ${otherId}::uuid
          join public.piques q on q.id = pa.pique_id
          where pa.user_id = ${actorId}::uuid and q.status = 'resolved'
        )
      group by l.user_id
    `,
  ]);
  const myNet = integer(nets.find((item) => item.user_id === actorId)?.total ?? 0);
  const theirNet = integer(nets.find((item) => item.user_id === otherId)?.total ?? 0);
  return {
    friend: { id: friend.id, name: friend.display_name, handle: friend.handle },
    sharedPlaygrounds,
    myWins: piques.filter((item) => item.my_win).length,
    theirWins: piques.filter((item) => item.their_win).length,
    myNet,
    theirNet,
    piques: piques.map((item) => ({
      id: item.id,
      playgroundId: item.playground_id,
      playgroundName: item.playground_name,
      question: item.question,
      myWin: item.my_win,
      theirWin: item.their_win,
    })),
  };
}

export async function listActivity(limit = 8, userId?: string): Promise<ActivityItem[]> {
  const actorId = userId ?? (await currentUserId());
  if (!actorId) return [];
  const sql = getSql();
  const items = await sql<{
    id: string;
    body: string;
    created_at: Date;
    actor_id: string | null;
    playground_id: string | null;
    pique_id: string | null;
    kind: NotificationKind | null;
    display_name: string | null;
  }[]>`
    select n.id, n.body, n.created_at, n.actor_id, n.playground_id, n.pique_id, n.kind, pr.display_name
    from public.notifications n
    left join public.profiles pr on pr.id = n.actor_id
    where n.user_id = ${actorId}::uuid
    order by n.created_at desc
    limit ${limit}
  `;
  return items.map((item) => ({
    id: item.id,
    who: item.actor_id ? (item.display_name ?? "Alguien") : "Piquify",
    body: item.body,
    when: relativeTime(iso(item.created_at)),
    href: activityHref({
      kind: item.kind,
      playgroundId: item.playground_id,
      piqueId: item.pique_id,
    }),
  }));
}

export async function listPlaygroundHistory(
  playgroundId: string,
  userId?: string,
): Promise<PlaygroundEventView[]> {
  const actorId = userId ?? (await currentUserId());
  if (!actorId) return [];
  const sql = getSql();
  const [member] = await sql<{ ok: boolean }[]>`
    select exists (
      select 1 from public.playground_members
      where playground_id = ${playgroundId}::uuid and user_id = ${actorId}::uuid
    ) as ok
  `;
  if (!member?.ok) return [];
  const items = await sql<{
    id: string;
    kind: string;
    pique_id: string | null;
    created_at: Date;
    actor_id: string | null;
    amount: number | null;
    display_name: string | null;
  }[]>`
    select e.id, e.kind, e.pique_id, e.created_at, e.actor_id, e.amount, pr.display_name
    from public.playground_events e
    left join public.profiles pr on pr.id = e.actor_id
    where e.playground_id = ${playgroundId}::uuid
    order by e.created_at desc
    limit 40
  `;
  return items.map((item) => {
    const amount = item.amount === null ? null : integer(item.amount);
    const body =
      amount !== null && (item.kind === "stake_hold" || item.kind === "stake_refund" || item.kind === "payout")
        ? `${historyLabel(item.kind)} ${Math.abs(amount)} pts.`
        : historyLabel(item.kind);
    return {
      id: item.id,
      who: item.actor_id ? (item.display_name ?? "Alguien") : "Piquify",
      body,
      when: relativeTime(iso(item.created_at)),
      href: item.pique_id ? `/playgrounds/${playgroundId}#pique-${item.pique_id}` : null,
    };
  });
}

export async function listAccess(userId: string): Promise<AccessItem[]> {
  const sql = getSql();
  const [invitations, requests, friendRequests] = await Promise.all([
    sql<{ id: string; playground_name: string; person_name: string }[]>`
      select i.id, pg.name as playground_name, pr.display_name as person_name
      from public.invitations i
      join public.playgrounds pg on pg.id = i.playground_id
      join public.profiles pr on pr.id = i.inviter_id
      where i.invitee_id = ${userId}::uuid and i.status = 'pending'
    `,
    sql<{
      id: string;
      user_id: string;
      admin_id: string;
      playground_name: string;
      person_name: string;
    }[]>`
      select r.id, r.user_id, pg.admin_id, pg.name as playground_name, pr.display_name as person_name
      from public.join_requests r
      join public.playgrounds pg on pg.id = r.playground_id
      join public.profiles pr on pr.id = r.user_id
      where r.status = 'pending'
        and (r.user_id = ${userId}::uuid or pg.admin_id = ${userId}::uuid)
    `,
    sql<{ id: string; person_name: string; direction: "incoming" | "outgoing" }[]>`
      select
        r.id,
        p.display_name as person_name,
        case when r.requester_id = ${userId}::uuid then 'outgoing' else 'incoming' end as direction
      from public.friend_requests r
      join public.profiles p
        on p.id = case when r.requester_id = ${userId}::uuid then r.addressee_id else r.requester_id end
      where r.status = 'pending'
        and (r.requester_id = ${userId}::uuid or r.addressee_id = ${userId}::uuid)
    `,
  ]);

  return [
    ...invitations.map((item) => ({
      id: item.id,
      playgroundName: item.playground_name,
      personName: item.person_name,
      kind: "invitation" as const,
    })),
    ...requests.map((item) => ({
      id: item.id,
      playgroundName: item.playground_name,
      personName: item.person_name,
      kind: (item.user_id === userId ? "own_request" : "request") as AccessItem["kind"],
    })),
    ...friendRequests.map((item) => ({
      id: item.id,
      playgroundName: "",
      personName: item.person_name,
      kind: (item.direction === "incoming" ? "friend_incoming" : "friend_outgoing") as AccessItem["kind"],
    })),
  ];
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

async function loadBalanceAndUnread(sql: ReturnType<typeof getSql>, userId: string) {
  const [balance, unread] = await Promise.all([
    sql<{ total: number }[]>`
      select coalesce(sum(amount), 0)::int as total
      from public.ledger_entries where user_id = ${userId}::uuid
    `,
    sql<{ n: number }[]>`
      select count(*)::int as n from public.notifications
      where user_id = ${userId}::uuid and read_at is null
    `,
  ]);
  return {
    points: integer(balance[0]?.total ?? 0),
    notifications: integer(unread[0]?.n ?? 0),
  };
}

async function loadStats(sql: ReturnType<typeof getSql>, userId: string): Promise<ProfileStats> {
  const [resolved, winners, netRow] = await Promise.all([
    sql<{ option_id: string; resolved_at: Date | null }[]>`
      select pa.option_id, q.resolved_at
      from public.participations pa
      join public.piques q on q.id = pa.pique_id
      where pa.user_id = ${userId}::uuid and q.status = 'resolved'
      order by q.resolved_at desc nulls last
    `,
    sql<{ option_id: string }[]>`
      select pw.option_id
      from public.pique_winners pw
      join public.participations pa on pa.pique_id = pw.pique_id
      where pa.user_id = ${userId}::uuid
    `,
    sql<{ total: number }[]>`
      select coalesce(sum(amount), 0)::int as total
      from public.ledger_entries
      where user_id = ${userId}::uuid
        and kind in ('stake_hold', 'stake_refund', 'payout')
    `,
  ]);
  const winnerIds = new Set(winners.map((item) => item.option_id));
  const wins = resolved.filter((item) => winnerIds.has(item.option_id));
  let streak = 0;
  for (const item of resolved) {
    if (!winnerIds.has(item.option_id)) break;
    streak += 1;
  }
  return {
    played: resolved.length,
    won: wins.length,
    accuracy: resolved.length === 0 ? 0 : Math.round((wins.length / resolved.length) * 100),
    streak,
    net: integer(netRow[0]?.total ?? 0),
  };
}

function closesLabel(status: PiqueStatus, closesAt: string, votingEndsAt: string | null) {
  if (status === "resolved") return "Resuelto";
  if (status === "cancelled") return "Cancelado";
  if (status === "pending_result" && votingEndsAt) {
    return `Votación hasta el ${dateFormatter.format(new Date(votingEndsAt))}`;
  }
  const formatted = dateFormatter.format(new Date(closesAt));
  return status === "open" ? `Cierra el ${formatted}` : `Cerrado el ${formatted}`;
}

function relativeTime(isoValue: string) {
  const minutes = Math.round((Date.now() - new Date(isoValue).getTime()) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

function integer(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error("INVALID_RESPONSE");
  return value;
}

function iso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function record(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalText(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}
