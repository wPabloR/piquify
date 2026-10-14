import postgres from "postgres";
import type { MemberRole, PiqueKind, PiqueStatus, VoteDecision } from "@/domain/models";
import type { PiqueRecord, UnitOfWork } from "@/application/ports";
import { LIKE_ESCAPE, likeContains } from "@/domain/like";
import { createFriendStores } from "@/infrastructure/postgres-friends";

type Sql = postgres.Sql | postgres.TransactionSql;

function text(value: unknown) {
  if (typeof value !== "string") throw new Error("INVALID_RESPONSE");
  return value;
}

function integer(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error("INVALID_RESPONSE");
  return value;
}

function date(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  throw new Error("INVALID_RESPONSE");
}

function mapPique(row: Record<string, unknown>): PiqueRecord {
  return {
    id: text(row.id),
    playgroundId: text(row.playground_id),
    question: text(row.question),
    detail: row.detail === null ? null : text(row.detail),
    kind: text(row.kind) as PiqueKind,
    status: text(row.status) as PiqueStatus,
    stake: integer(row.stake),
    closesAt: date(row.closes_at),
    createdBy: text(row.created_by),
  };
}

export function createStores(tx: Sql): UnitOfWork {
  return {
    ...createFriendStores(tx),
    async lockUser(userId) {
      await tx`select pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`;
    },
    async lockPique(id) {
      const [row] = await tx<Record<string, unknown>[]>`
        select * from public.piques where id = ${id}::uuid for update
      `;
      return row ? mapPique(row) : null;
    },
    async insertPique(input) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.piques (
          playground_id, question, detail, kind, status, stake, closes_at, created_by, allow_new_options
        ) values (
          ${input.playgroundId}::uuid,
          ${input.question},
          ${input.detail},
          ${input.kind}::public.pique_kind,
          'open',
          ${input.stake},
          ${input.closesAt.toISOString()}::timestamptz,
          ${input.createdBy}::uuid,
          false
        )
        returning id
      `;
      if (!row) throw new Error("INVALID_RESPONSE");
      return row.id;
    },
    async updatePiqueStatus(id, status, resolvedAt) {
      if (resolvedAt) {
        await tx`
          update public.piques
          set status = ${status}::public.pique_status, updated_at = now(), resolved_at = ${resolvedAt.toISOString()}::timestamptz
          where id = ${id}::uuid
        `;
        return;
      }
      await tx`
        update public.piques
        set status = ${status}::public.pique_status, updated_at = now()
        where id = ${id}::uuid
      `;
    },
    async listExpiredOpenPiques() {
      const rows = await tx<{ id: string; playground_id: string }[]>`
        select p.id, p.playground_id
        from public.piques p
        where p.status = 'open' and p.closes_at <= now()
        for update skip locked
      `;
      const result: { id: string; playgroundId: string; participantCount: number }[] = [];
      for (const row of rows) {
        result.push({
          id: row.id,
          playgroundId: row.playground_id,
          participantCount: await this.countParticipations(row.id),
        });
      }
      return result;
    },
    async listExpiredVotingPiqueIds() {
      const rows = await tx<{ id: string }[]>`
        select p.id
        from public.piques p
        join public.result_proposals r on r.pique_id = p.id
        where p.status = 'pending_result' and r.voting_ends_at <= now()
        for update of p skip locked
      `;
      return rows.map((row) => row.id);
    },
    async isMember(playgroundId, userId) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.playground_members
          where playground_id = ${playgroundId}::uuid and user_id = ${userId}::uuid
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async memberRole(playgroundId, userId) {
      const [row] = await tx<{ role: MemberRole }[]>`
        select role from public.playground_members
        where playground_id = ${playgroundId}::uuid and user_id = ${userId}::uuid
      `;
      return row?.role ?? null;
    },
    async addMember(playgroundId, userId, role) {
      await tx`
        insert into public.playground_members (playground_id, user_id, role)
        values (${playgroundId}::uuid, ${userId}::uuid, ${role}::public.member_role)
        on conflict do nothing
      `;
    },
    async listMemberIds(playgroundId) {
      const rows = await tx<{ user_id: string }[]>`
        select user_id from public.playground_members where playground_id = ${playgroundId}::uuid
      `;
      return rows.map((row) => row.user_id);
    },
    async optionExists(piqueId, optionId) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.pique_options
          where id = ${optionId}::uuid and pique_id = ${piqueId}::uuid
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async insertOptions(piqueId, labels) {
      for (const [position, label] of labels.entries()) {
        await tx`
          insert into public.pique_options (pique_id, label, position)
          values (${piqueId}::uuid, ${label}, ${position})
        `;
      }
    },
    async getParticipation(piqueId, userId) {
      const [row] = await tx<{ option_id: string }[]>`
        select option_id from public.participations
        where pique_id = ${piqueId}::uuid and user_id = ${userId}::uuid
      `;
      return row ? { optionId: row.option_id } : null;
    },
    async setParticipation(piqueId, userId, optionId) {
      await tx`
        update public.participations
        set option_id = ${optionId}::uuid
        where pique_id = ${piqueId}::uuid and user_id = ${userId}::uuid
      `;
    },
    async insertParticipation(piqueId, userId, optionId) {
      await tx`
        insert into public.participations (pique_id, user_id, option_id)
        values (${piqueId}::uuid, ${userId}::uuid, ${optionId}::uuid)
      `;
    },
    async deleteParticipation(piqueId, userId) {
      await tx`
        delete from public.participations
        where pique_id = ${piqueId}::uuid and user_id = ${userId}::uuid
      `;
    },
    async listParticipations(piqueId) {
      const rows = await tx<{ user_id: string; option_id: string }[]>`
        select user_id, option_id from public.participations where pique_id = ${piqueId}::uuid
      `;
      return rows.map((row) => ({ userId: row.user_id, optionId: row.option_id }));
    },
    async countParticipations(piqueId) {
      const [row] = await tx<{ n: number }[]>`
        select count(*)::int as n from public.participations where pique_id = ${piqueId}::uuid
      `;
      return integer(row?.n ?? 0);
    },
    async lockLedger(userId) {
      await tx`select 1 from public.ledger_entries where user_id = ${userId}::uuid for update`;
    },
    async balance(userId) {
      const [row] = await tx<{ total: number }[]>`
        select coalesce(sum(amount), 0)::int as total
        from public.ledger_entries where user_id = ${userId}::uuid
      `;
      return integer(row?.total ?? 0);
    },
    async insertLedger(input) {
      await tx`
        insert into public.ledger_entries (user_id, amount, kind, playground_id, pique_id)
        values (
          ${input.userId}::uuid,
          ${input.amount},
          ${input.kind}::public.ledger_kind,
          ${input.playgroundId}::uuid,
          ${input.piqueId}::uuid
        )
      `;
    },
    async insertProposal(input) {
      await tx`
        insert into public.result_proposals (pique_id, option_id, proposed_by, voting_ends_at)
        values (
          ${input.piqueId}::uuid,
          ${input.optionId}::uuid,
          ${input.proposedBy}::uuid,
          ${input.votingEndsAt.toISOString()}::timestamptz
        )
      `;
    },
    async getProposal(piqueId) {
      const [row] = await tx<Record<string, unknown>[]>`
        select * from public.result_proposals where pique_id = ${piqueId}::uuid
      `;
      if (!row) return null;
      return {
        piqueId: text(row.pique_id),
        optionId: text(row.option_id),
        proposedBy: text(row.proposed_by),
        votingEndsAt: date(row.voting_ends_at),
      };
    },
    async hasVote(piqueId, userId) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.result_votes
          where pique_id = ${piqueId}::uuid and user_id = ${userId}::uuid
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async insertVote(input) {
      await tx`
        insert into public.result_votes (pique_id, user_id, decision, suggested_option_id)
        values (
          ${input.piqueId}::uuid,
          ${input.userId}::uuid,
          ${input.decision}::public.vote_decision,
          ${input.suggestedOptionId}::uuid
        )
      `;
    },
    async listVotes(piqueId) {
      const rows = await tx<{ user_id: string; decision: VoteDecision; suggested_option_id: string | null }[]>`
        select user_id, decision, suggested_option_id from public.result_votes where pique_id = ${piqueId}::uuid
      `;
      return rows.map((row) => ({
        userId: row.user_id,
        decision: row.decision,
        suggestedOptionId: row.suggested_option_id,
      }));
    },
    async insertWinners(piqueId, optionIds) {
      for (const optionId of optionIds) {
        await tx`
          insert into public.pique_winners (pique_id, option_id)
          values (${piqueId}::uuid, ${optionId}::uuid)
        `;
      }
    },
    async lockResiduals(playgroundId, participantKey) {
      await tx`
        select 1 from public.residuals
        where playground_id = ${playgroundId}::uuid
          and consumed_by_pique_id is null
          and participant_key = ${participantKey}
        for update
      `;
    },
    async openResiduals(playgroundId, participantKey) {
      const rows = await tx<{ id: string; amount: number; participant_ids: string[] }[]>`
        select id, amount, participant_ids
        from public.residuals
        where playground_id = ${playgroundId}::uuid
          and consumed_by_pique_id is null
          and participant_key = ${participantKey}
      `;
      return rows.map((row) => ({
        id: row.id,
        amount: integer(row.amount),
        participantIds: row.participant_ids,
      }));
    },
    async consumeResiduals(playgroundId, participantKey, piqueId) {
      await tx`
        update public.residuals
        set consumed_by_pique_id = ${piqueId}::uuid
        where playground_id = ${playgroundId}::uuid
          and consumed_by_pique_id is null
          and participant_key = ${participantKey}
      `;
    },
    async insertResidual(input) {
      await tx`
        insert into public.residuals (
          playground_id, amount, participant_key, participant_ids, source_pique_id
        ) values (
          ${input.playgroundId}::uuid,
          ${input.amount},
          ${input.participantKey},
          ${tx.array(input.participantIds)}::uuid[],
          ${input.sourcePiqueId}::uuid
        )
      `;
    },
    async insertEvent(input) {
      await tx`
        insert into public.playground_events (
          playground_id, actor_id, subject_user_id, pique_id, kind, amount
        ) values (
          ${input.playgroundId}::uuid,
          ${input.actorId}::uuid,
          ${input.subjectUserId ?? null}::uuid,
          ${input.piqueId ?? null}::uuid,
          ${input.kind}::public.playground_event_kind,
          ${input.amount ?? null}
        )
      `;
    },
    async notifyMembers(input) {
      await tx`
        insert into public.notifications (user_id, playground_id, actor_id, body, kind, pique_id)
        select user_id, ${input.playgroundId}::uuid, ${input.actorId}::uuid, ${input.body.slice(0, 240)},
          ${input.kind}::public.notification_kind, ${input.piqueId ?? null}::uuid
        from public.playground_members
        where playground_id = ${input.playgroundId}::uuid
          and user_id is distinct from ${input.actorId}::uuid
      `;
    },
    async insertNotification(input) {
      await tx`
        insert into public.notifications (user_id, playground_id, actor_id, body, kind, pique_id)
        values (
          ${input.userId}::uuid,
          ${input.playgroundId ?? null}::uuid,
          ${input.actorId}::uuid,
          ${input.body.slice(0, 240)},
          ${input.kind}::public.notification_kind,
          ${input.piqueId ?? null}::uuid
        )
      `;
    },
    async markNotificationsRead(userId) {
      await tx`
        update public.notifications
        set read_at = now()
        where user_id = ${userId}::uuid and read_at is null
      `;
    },
    async profileById(userId) {
      const [row] = await tx<{ id: string; display_name: string; handle: string; friend_code: string }[]>`
        select id, display_name, handle, friend_code from public.profiles where id = ${userId}::uuid
      `;
      return row
        ? { id: row.id, name: row.display_name, handle: row.handle, friendCode: row.friend_code }
        : null;
    },
    async profileByHandle(handle) {
      const [row] = await tx<{ id: string }[]>`
        select id from public.profiles where handle = ${handle}
      `;
      return row ?? null;
    },
    async insertProfile(input) {
      await tx`
        insert into public.profiles (id, display_name, handle, friend_code)
        values (${input.id}::uuid, ${input.name}, ${input.handle}, ${input.friendCode})
      `;
    },
    async insertOpeningBalance(userId) {
      await tx`
        insert into public.ledger_entries (user_id, amount, kind)
        values (${userId}::uuid, 200, 'opening_balance')
      `;
    },
    async updateDisplayName(userId, name) {
      await tx`
        update public.profiles set display_name = ${name} where id = ${userId}::uuid
      `;
    },
    async insertPlayground(input) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.playgrounds (name, tagline, emoji, admin_id)
        values (${input.name}, ${input.tagline}, ${input.emoji}, ${input.adminId}::uuid)
        returning id
      `;
      if (!row) throw new Error("INVALID_RESPONSE");
      return row.id;
    },
    async playgroundById(id) {
      const [row] = await tx<{ id: string; public_code: string; admin_id: string }[]>`
        select id, public_code, admin_id from public.playgrounds where id = ${id}::uuid
      `;
      return row ? { id: row.id, publicCode: row.public_code, adminId: row.admin_id } : null;
    },
    async playgroundByCode(code) {
      const [row] = await tx<{ id: string; admin_id: string }[]>`
        select id, admin_id from public.playgrounds where public_code = ${code}
      `;
      return row ? { id: row.id, adminId: row.admin_id } : null;
    },
    async touchPlayground(id) {
      await tx`update public.playgrounds set updated_at = now() where id = ${id}::uuid`;
    },
    async searchPlaygrounds(userId, query) {
      const needle = likeContains(query.toLowerCase());
      const code = query.trim().toLowerCase();
      const rows = await tx<
        { id: string; name: string; tagline: string; emoji: string; access: string }[]
      >`
        select
          p.id,
          p.name,
          p.tagline,
          p.emoji,
          case
            when exists (
              select 1 from public.playground_members m
              where m.playground_id = p.id and m.user_id = ${userId}::uuid
            ) then 'member'
            when exists (
              select 1 from public.join_requests r
              where r.playground_id = p.id and r.user_id = ${userId}::uuid and r.status = 'pending'
            ) then 'pending_request'
            else 'none'
          end as access
        from public.playgrounds p
        where lower(p.name) like ${needle} escape ${LIKE_ESCAPE}
          or lower(p.tagline) like ${needle} escape ${LIKE_ESCAPE}
          or p.public_code = ${code}
        order by p.updated_at desc
        limit 20
      `;
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        tagline: row.tagline,
        emoji: row.emoji,
        access: row.access as "member" | "pending_request" | "none",
      }));
    },
    async pendingInvitationExists(playgroundId, inviteeId) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.invitations
          where playground_id = ${playgroundId}::uuid
            and invitee_id = ${inviteeId}::uuid
            and status = 'pending'
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async insertInvitation(playgroundId, inviterId, inviteeId) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.invitations (playground_id, inviter_id, invitee_id)
        values (${playgroundId}::uuid, ${inviterId}::uuid, ${inviteeId}::uuid)
        returning id
      `;
      if (!row) throw new Error("INVALID_RESPONSE");
      return row.id;
    },
    async lockInvitation(id) {
      const [row] = await tx<{ id: string; playground_id: string; invitee_id: string; status: string }[]>`
        select id, playground_id, invitee_id, status from public.invitations where id = ${id}::uuid for update
      `;
      return row
        ? { id: row.id, playgroundId: row.playground_id, inviteeId: row.invitee_id, status: row.status }
        : null;
    },
    async setInvitationStatus(id, status) {
      await tx`
        update public.invitations
        set status = ${status}::public.access_status
        where id = ${id}::uuid
      `;
    },
    async declinePendingInvitations(playgroundId, inviteeId) {
      await tx`
        update public.invitations
        set status = 'declined'
        where playground_id = ${playgroundId}::uuid
          and invitee_id = ${inviteeId}::uuid
          and status = 'pending'
      `;
    },
    async pendingRequestExists(playgroundId, userId) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.join_requests
          where playground_id = ${playgroundId}::uuid
            and user_id = ${userId}::uuid
            and status = 'pending'
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async insertJoinRequest(playgroundId, userId) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.join_requests (playground_id, user_id)
        values (${playgroundId}::uuid, ${userId}::uuid)
        returning id
      `;
      if (!row) throw new Error("INVALID_RESPONSE");
      return row.id;
    },
    async lockJoinRequest(id) {
      const [row] = await tx<{ id: string; playground_id: string; user_id: string; status: string }[]>`
        select id, playground_id, user_id, status from public.join_requests where id = ${id}::uuid for update
      `;
      return row
        ? { id: row.id, playgroundId: row.playground_id, userId: row.user_id, status: row.status }
        : null;
    },
    async setJoinRequestStatus(id, status) {
      await tx`
        update public.join_requests
        set status = ${status}::public.access_status
        where id = ${id}::uuid
      `;
    },
    async declinePendingRequests(playgroundId, userId) {
      await tx`
        update public.join_requests
        set status = 'declined'
        where playground_id = ${playgroundId}::uuid
          and user_id = ${userId}::uuid
          and status = 'pending'
      `;
    },
  };
}

export async function withUnitOfWork<T>(work: (uow: UnitOfWork) => Promise<T>): Promise<T> {
  const sql = (await import("@/infrastructure/db")).getSql();
  return sql.begin((tx) => work(createStores(tx))) as Promise<T>;
}
