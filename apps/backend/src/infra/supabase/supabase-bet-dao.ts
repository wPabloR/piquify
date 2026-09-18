import type { SupabaseClient } from "@supabase/supabase-js";
import type { BetStatus, ResultVoteChoice } from "@piquify/contracts";
import type {
  Bet,
  BetOption,
  BetParticipant,
  BetResultVote,
  BetSummary,
  ResultDueNotification,
  ResultVoteNotification,
} from "../../entities/bet.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type { BetLifecycleFilter } from "../../interfaces/bet/bet-dao.js";

type OptionRow = {
  id: string;
  label: string;
  position: number;
};

type BetRow = {
  id: string;
  playground_id: string;
  title: string;
  stake: number;
  deadline: string;
  status: BetStatus;
  winning_option_id: string | null;
  vote_closes_at: string | null;
  created_by: string;
  created_at: string;
};

type BetWithOptionsRow = BetRow & {
  bet_options: OptionRow[] | OptionRow | null;
};

const betColumns =
  "id, playground_id, title, stake, deadline, status, winning_option_id, vote_closes_at, created_by, created_at";

function mapOptions(value: OptionRow[] | OptionRow | null): BetOption[] {
  const rows = Array.isArray(value) ? value : value ? [value] : [];
  return rows
    .map((row) => ({
      id: row.id,
      label: row.label,
      position: row.position,
    }))
    .sort((left, right) => left.position - right.position);
}

function mapSummary(row: BetRow): BetSummary {
  return {
    id: row.id,
    playgroundId: row.playground_id,
    title: row.title,
    stake: row.stake,
    deadline: new Date(row.deadline),
    status: row.status,
    winningOptionId: row.winning_option_id,
    voteClosesAt: row.vote_closes_at ? new Date(row.vote_closes_at) : null,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

function mapBet(row: BetWithOptionsRow): Bet {
  return {
    ...mapSummary(row),
    options: mapOptions(row.bet_options),
  };
}

function scopedBets<T extends { eq: Function; in: Function }>(
  request: T,
  filter: BetLifecycleFilter,
): T {
  if (filter.playgroundId) {
    request = request.eq("playground_id", filter.playgroundId);
  }
  if (filter.playgroundIds?.length) {
    request = request.in("playground_id", filter.playgroundIds);
  }
  if (filter.betId) {
    request = request.eq("id", filter.betId);
  }
  return request;
}

export default class SupabaseBetDao implements BetDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: {
    playgroundId: string;
    createdBy: string;
    title: string;
    stake: number;
    deadline: Date;
    options: string[];
  }): Promise<Bet> {
    const { data, error } = await this.supabase
      .from("bets")
      .insert({
        playground_id: input.playgroundId,
        created_by: input.createdBy,
        title: input.title,
        stake: input.stake,
        deadline: input.deadline.toISOString(),
        status: "open",
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    const betId = (data as { id: string }).id;
    const { error: optionsError } = await this.supabase.from("bet_options").insert(
      input.options.map((label, position) => ({
        bet_id: betId,
        label,
        position,
      })),
    );

    if (optionsError) {
      await this.supabase.from("bets").delete().eq("id", betId);
      throw optionsError;
    }

    const created = await this.findById(betId);
    if (!created) {
      throw new Error("Bet was created but could not be loaded");
    }
    return created;
  }

  async findById(id: string): Promise<Bet | null> {
    const { data, error } = await this.supabase
      .from("bets")
      .select(`${betColumns}, bet_options!bet_options_bet_id_fkey(id, label, position)`)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapBet(data as BetWithOptionsRow);
  }

  async listForPlayground(playgroundId: string): Promise<BetSummary[]> {
    const { data, error } = await this.supabase
      .from("bets")
      .select(betColumns)
      .eq("playground_id", playgroundId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as BetRow[]).map(mapSummary);
  }

  async lockExpired(now: Date, filter: BetLifecycleFilter): Promise<void> {
    if (!filter.playgroundId && !filter.betId && !filter.playgroundIds?.length) {
      return;
    }

    const { error } = await scopedBets(
      this.supabase
        .from("bets")
        .update({ status: "locked" })
        .eq("status", "open")
        .lte("deadline", now.toISOString()),
      filter,
    );

    if (error) {
      throw error;
    }
  }

  async proposeResult(
    betId: string,
    optionId: string,
    voteClosesAt: Date,
  ): Promise<Bet> {
    const { error } = await this.supabase
      .from("bets")
      .update({
        status: "pending_result",
        winning_option_id: optionId,
        vote_closes_at: voteClosesAt.toISOString(),
      })
      .eq("id", betId);

    if (error) {
      throw error;
    }

    const updated = await this.findById(betId);
    if (!updated) {
      throw new Error("Bet proposal was saved but could not be loaded");
    }
    return updated;
  }

  async setResult(betId: string, optionId: string): Promise<Bet> {
    const { error } = await this.supabase
      .from("bets")
      .update({
        status: "resolved",
        winning_option_id: optionId,
      })
      .eq("id", betId);

    if (error) {
      throw error;
    }

    const updated = await this.findById(betId);
    if (!updated) {
      throw new Error("Bet result was saved but could not be loaded");
    }
    return updated;
  }

  async setStatus(betId: string, status: BetStatus): Promise<void> {
    const { error } = await this.supabase
      .from("bets")
      .update({ status })
      .eq("id", betId);

    if (error) {
      throw error;
    }
  }

  async listParticipants(betId: string): Promise<BetParticipant[]> {
    const { data, error } = await this.supabase
      .from("bet_participants")
      .select("user_id, option_id")
      .eq("bet_id", betId);

    if (error) {
      throw error;
    }

    return ((data ?? []) as { user_id: string; option_id: string }[]).map(
      (row) => ({
        userId: row.user_id,
        optionId: row.option_id,
      }),
    );
  }

  async addParticipant(input: {
    betId: string;
    userId: string;
    optionId: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("bet_participants").insert({
      bet_id: input.betId,
      user_id: input.userId,
      option_id: input.optionId,
    });

    if (error) {
      throw error;
    }
  }

  async removeParticipant(betId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("bet_participants")
      .delete()
      .eq("bet_id", betId)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }
  }

  async listVotes(betId: string): Promise<BetResultVote[]> {
    const { data, error } = await this.supabase
      .from("bet_result_votes")
      .select("user_id, choice, suggested_option_id")
      .eq("bet_id", betId);

    if (error) {
      throw error;
    }

    return (
      (data ?? []) as {
        user_id: string;
        choice: ResultVoteChoice;
        suggested_option_id: string | null;
      }[]
    ).map((row) => ({
      userId: row.user_id,
      choice: row.choice,
      suggestedOptionId: row.suggested_option_id,
    }));
  }

  async upsertVote(input: {
    betId: string;
    userId: string;
    choice: ResultVoteChoice;
    suggestedOptionId: string | null;
  }): Promise<void> {
    const { error } = await this.supabase.from("bet_result_votes").upsert(
      {
        bet_id: input.betId,
        user_id: input.userId,
        choice: input.choice,
        suggested_option_id: input.suggestedOptionId,
      },
      { onConflict: "bet_id,user_id" },
    );

    if (error) {
      throw error;
    }
  }

  async listLockedAwaitingResult(
    playgroundIds: string[],
  ): Promise<ResultDueNotification[]> {
    if (playgroundIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("bets")
      .select("id, playground_id, title, deadline, playgrounds ( name )")
      .in("playground_id", playgroundIds)
      .eq("status", "locked")
      .order("deadline", { ascending: true });

    if (error) {
      throw error;
    }

    return (
      (data ?? []) as {
        id: string;
        playground_id: string;
        title: string;
        deadline: string;
        playgrounds: { name: string } | { name: string }[] | null;
      }[]
    ).map((row) => ({
      betId: row.id,
      playgroundId: row.playground_id,
      playgroundName: playgroundName(row.playgrounds),
      title: row.title,
      deadline: new Date(row.deadline),
    }));
  }

  async listPendingResultVotesForUser(
    userId: string,
  ): Promise<ResultVoteNotification[]> {
    const { data, error } = await this.supabase
      .from("bets")
      .select(
        "id, playground_id, title, vote_closes_at, winning_option_id, playgrounds ( name ), bet_options!bet_options_bet_id_fkey ( id, label ), bet_participants!inner ( user_id )",
      )
      .eq("status", "pending_result")
      .eq("bet_participants.user_id", userId);

    if (error) {
      throw error;
    }

    const rows =
      (data ?? []) as {
        id: string;
        playground_id: string;
        title: string;
        vote_closes_at: string | null;
        winning_option_id: string | null;
        playgrounds: { name: string } | { name: string }[] | null;
        bet_options: { id: string; label: string }[] | { id: string; label: string } | null;
      }[];

    if (rows.length === 0) {
      return [];
    }

    const { data: votes, error: votesError } = await this.supabase
      .from("bet_result_votes")
      .select("bet_id")
      .eq("user_id", userId)
      .in(
        "bet_id",
        rows.map((row) => row.id),
      );

    if (votesError) {
      throw votesError;
    }

    const voted = new Set(
      ((votes ?? []) as { bet_id: string }[]).map((row) => row.bet_id),
    );

    return rows
      .filter((row) => !voted.has(row.id) && row.vote_closes_at)
      .map((row) => {
        const options = Array.isArray(row.bet_options)
          ? row.bet_options
          : row.bet_options
            ? [row.bet_options]
            : [];
        return {
          betId: row.id,
          playgroundId: row.playground_id,
          playgroundName: playgroundName(row.playgrounds),
          title: row.title,
          voteClosesAt: new Date(row.vote_closes_at as string),
          proposedOptionLabel:
            options.find((option) => option.id === row.winning_option_id)
              ?.label ?? "el resultado propuesto",
        };
      });
  }

  async listExpiredPendingResults(
    now: Date,
    filter: BetLifecycleFilter,
  ): Promise<Bet[]> {
    if (!filter.playgroundId && !filter.betId && !filter.playgroundIds?.length) {
      return [];
    }

    const { data, error } = await scopedBets(
      this.supabase
        .from("bets")
        .select(
          `${betColumns}, bet_options!bet_options_bet_id_fkey(id, label, position)`,
        )
        .eq("status", "pending_result")
        .lte("vote_closes_at", now.toISOString()),
      filter,
    );

    if (error) {
      throw error;
    }

    return ((data ?? []) as BetWithOptionsRow[]).map(mapBet);
  }

  async isSettled(betId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("bets")
      .select("settled_at")
      .eq("id", betId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean((data as { settled_at: string | null } | null)?.settled_at);
  }

  async markSettled(betId: string): Promise<void> {
    const { error } = await this.supabase
      .from("bets")
      .update({ settled_at: new Date().toISOString() })
      .eq("id", betId)
      .is("settled_at", null);

    if (error) {
      throw error;
    }
  }

  async saveResidual(input: {
    playgroundId: string;
    betId: string;
    amount: number;
    memberIds: string[];
  }): Promise<void> {
    const { data, error } = await this.supabase
      .from("residual_pots")
      .insert({
        playground_id: input.playgroundId,
        source_bet_id: input.betId,
        amount: input.amount,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return;
      }
      throw error;
    }

    const potId = (data as { id: string } | null)?.id;
    if (!potId || input.memberIds.length === 0) {
      return;
    }

    const { error: membersError } = await this.supabase
      .from("residual_pot_members")
      .insert(
        input.memberIds.map((userId) => ({
          pot_id: potId,
          user_id: userId,
        })),
      );

    if (membersError && membersError.code !== "23505") {
      throw membersError;
    }
  }
}

function playgroundName(
  value: { name: string } | { name: string }[] | null,
): string {
  if (Array.isArray(value)) {
    return value[0]?.name ?? "";
  }
  return value?.name ?? "";
}
