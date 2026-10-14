import type { VoteDecision } from "@/domain/models";

export interface SettlementVote {
  userId: string;
  decision: VoteDecision;
  suggestedOptionId?: string;
}

export type SettlementDecision =
  | { state: "pending" }
  | { state: "resolved"; winnerOptionIds: string[] };

export function decideWinners(input: {
  participantIds: readonly string[];
  proposerId: string;
  proposedOptionId: string;
  votes: readonly SettlementVote[];
  votingClosed: boolean;
}): SettlementDecision {
  const participants = [...new Set(input.participantIds)];
  if (participants.length === 0) throw new Error("NO_PARTICIPANTS");

  const proposerParticipates = participants.includes(input.proposerId);
  const votes = new Map<string, SettlementVote>();
  for (const vote of input.votes) {
    if (!participants.includes(vote.userId)) continue;
    if (proposerParticipates && vote.userId === input.proposerId) continue;
    votes.set(vote.userId, vote);
  }

  let approves = proposerParticipates ? 1 : 0;
  let rejects = 0;
  const suggestions = new Map<string, number>();

  for (const participantId of participants) {
    if (proposerParticipates && participantId === input.proposerId) continue;
    const vote = votes.get(participantId);
    if (!vote) {
      if (!input.votingClosed) return { state: "pending" };
      approves += 1;
      continue;
    }
    if (vote.decision === "approve") {
      approves += 1;
      continue;
    }
    rejects += 1;
    if (vote.suggestedOptionId) {
      suggestions.set(
        vote.suggestedOptionId,
        (suggestions.get(vote.suggestedOptionId) ?? 0) + 1,
      );
    }
  }

  if (rejects > approves) {
    const top = Math.max(0, ...suggestions.values());
    if (top === 0) {
      return { state: "resolved", winnerOptionIds: [input.proposedOptionId] };
    }
    return {
      state: "resolved",
      winnerOptionIds: [...suggestions.keys()]
        .filter((optionId) => suggestions.get(optionId) === top)
        .sort(),
    };
  }

  return { state: "resolved", winnerOptionIds: [input.proposedOptionId] };
}
