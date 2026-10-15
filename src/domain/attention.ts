import { canCastVote, canPropose } from "@/domain/access";
import type { PiqueStatus } from "@/domain/models";

export const ATTENTION_WINDOW_MS = 24 * 60 * 60 * 1000;
export const ATTENTION_LIMIT = 10;

export type AttentionKind = "vote" | "propose" | "closing";

export interface AttentionCandidate {
  piqueId: string;
  playgroundId: string;
  question: string;
  playgroundName: string;
  status: PiqueStatus;
  closesAt: Date;
  votingEndsAt: Date | null;
  isAdmin: boolean;
  isMember: boolean;
  isParticipant: boolean;
  isProposer: boolean;
  alreadyVoted: boolean;
}

export interface AttentionPick {
  kind: AttentionKind;
  piqueId: string;
  playgroundId: string;
  question: string;
  playgroundName: string;
  dueAt: Date;
}

const kindOrder: Record<AttentionKind, number> = {
  vote: 0,
  propose: 1,
  closing: 2,
};

export function attentionKind(input: AttentionCandidate, now: Date): AttentionKind | null {
  if (!input.isMember) return null;
  const canVote = canCastVote({
    status: input.status,
    isParticipant: input.isParticipant,
    isProposer: input.isProposer,
    alreadyVoted: input.alreadyVoted,
    votingEndsAt: input.votingEndsAt ?? new Date(0),
    now,
  }).ok;
  if (canVote) return "vote";
  if (canPropose({ isAdmin: input.isAdmin, status: input.status })) return "propose";
  if (
    input.status === "open" &&
    input.closesAt > now &&
    input.closesAt.getTime() - now.getTime() <= ATTENTION_WINDOW_MS
  ) {
    return "closing";
  }
  return null;
}

export function selectAttentionItems<T extends { kind: AttentionKind; dueAt: Date; piqueId: string }>(
  items: readonly T[],
  limit = ATTENTION_LIMIT,
): T[] {
  return [...items].sort((left, right) => {
    const byKind = kindOrder[left.kind] - kindOrder[right.kind];
    if (byKind !== 0) return byKind;
    const byDue = left.dueAt.getTime() - right.dueAt.getTime();
    if (byDue !== 0) return byDue;
    return left.piqueId.localeCompare(right.piqueId);
  }).slice(0, limit);
}

export function buildAttentionItems(
  candidates: readonly AttentionCandidate[],
  now: Date,
): AttentionPick[] {
  const classified: AttentionPick[] = [];
  for (const candidate of candidates) {
    const kind = attentionKind(candidate, now);
    if (!kind) continue;
    classified.push({
      kind,
      piqueId: candidate.piqueId,
      playgroundId: candidate.playgroundId,
      question: candidate.question,
      playgroundName: candidate.playgroundName,
      dueAt: kind === "vote" ? (candidate.votingEndsAt ?? candidate.closesAt) : candidate.closesAt,
    });
  }
  return selectAttentionItems(classified);
}
