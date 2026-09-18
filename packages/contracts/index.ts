export const INITIAL_ACCOUNT_BALANCE = 200;

export const BET_TITLE_MAX_LENGTH = 80;
export const BET_OPTION_LABEL_MAX_LENGTH = 80;
export const BET_MIN_OPTIONS = 2;
export const BET_MAX_OPTIONS = 10;
export const BET_MIN_STAKE = 1;

export const RESULT_VOTE_HOURS = 48;

export const BET_STATUSES = [
  "open",
  "locked",
  "pending_result",
  "resolved",
  "cancelled",
] as const;

export type BetStatus = (typeof BET_STATUSES)[number];

export function effectiveBetStatus(
  status: BetStatus,
  deadline: Date,
  now = new Date(),
): BetStatus {
  if (status === "open" && deadline.getTime() <= now.getTime()) {
    return "locked";
  }
  return status;
}

export type PayoutSettlement = {
  pot: number;
  share: number;
  residual: number;
  refund: number;
};

export function settlePayout(input: {
  stake: number;
  participantCount: number;
  winnerCount: number;
}): PayoutSettlement {
  const pot = input.stake * input.participantCount;
  if (input.winnerCount <= 0) {
    return { pot, share: 0, residual: 0, refund: input.stake };
  }
  return {
    pot,
    share: Math.floor(pot / input.winnerCount),
    residual: pot % input.winnerCount,
    refund: 0,
  };
}

export type ResultVoteChoice = "confirm" | "reject";

export type ResultVote = {
  userId: string;
  choice: ResultVoteChoice;
  suggestedOptionId: string | null;
};

export function resultVoteClosesAt(
  proposedAt: Date,
  hours = RESULT_VOTE_HOURS,
): Date {
  return new Date(proposedAt.getTime() + hours * 60 * 60 * 1000);
}

export function resolveProposedResult(input: {
  proposedOptionId: string;
  participantIds: string[];
  votes: ResultVote[];
  now: Date;
  voteClosesAt: Date;
}): { winningOptionId: string } | null {
  if (input.participantIds.length === 0) {
    return { winningOptionId: input.proposedOptionId };
  }

  const votesByUser = new Map(input.votes.map((vote) => [vote.userId, vote]));
  const pendingIds = input.participantIds.filter((id) => !votesByUser.has(id));
  const timedOut = input.now.getTime() >= input.voteClosesAt.getTime();

  if (pendingIds.length > 0 && !timedOut) {
    return null;
  }

  const confirms =
    input.votes.filter((vote) => vote.choice === "confirm").length +
    (timedOut ? pendingIds.length : 0);
  const rejects = input.votes.filter((vote) => vote.choice === "reject");

  if (rejects.length > confirms) {
    const counts = new Map<string, number>();
    for (const vote of rejects) {
      if (!vote.suggestedOptionId) {
        continue;
      }
      counts.set(
        vote.suggestedOptionId,
        (counts.get(vote.suggestedOptionId) ?? 0) + 1,
      );
    }

    let winningOptionId: string | null = null;
    let bestCount = 0;
    let tied = false;
    for (const [optionId, count] of counts) {
      if (count > bestCount) {
        winningOptionId = optionId;
        bestCount = count;
        tied = false;
      } else if (count === bestCount) {
        tied = true;
      }
    }

    if (winningOptionId && !tied) {
      return { winningOptionId };
    }
  }

  return { winningOptionId: input.proposedOptionId };
}
