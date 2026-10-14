import type { MemberRole, PiqueStatus } from "@/domain/models";

export function canCreatePique(role: MemberRole): boolean {
  return role === "admin";
}

export function canJoin(input: {
  isMember: boolean;
  status: PiqueStatus;
  closesAt: Date;
  now: Date;
  balance: number;
  stake: number;
  alreadyParticipating: boolean;
}):
  | { ok: true; mode: "join" | "change" }
  | { ok: false; code: "NOT_A_MEMBER" | "PIQUE_CLOSED" | "INSUFFICIENT_BALANCE" } {
  if (!input.isMember) return { ok: false, code: "NOT_A_MEMBER" };
  if (input.status !== "open" || input.closesAt <= input.now) {
    return { ok: false, code: "PIQUE_CLOSED" };
  }
  if (input.alreadyParticipating) return { ok: true, mode: "change" };
  if (!Number.isInteger(input.balance) || !Number.isInteger(input.stake) || input.balance < input.stake) {
    return { ok: false, code: "INSUFFICIENT_BALANCE" };
  }
  return { ok: true, mode: "join" };
}

export function canLeave(input: {
  status: PiqueStatus;
  closesAt: Date;
  now: Date;
  participating: boolean;
}): { ok: true } | { ok: false; code: "NOT_PARTICIPANT" | "PIQUE_CLOSED" } {
  if (!input.participating) return { ok: false, code: "NOT_PARTICIPANT" };
  if (input.status !== "open" || input.closesAt <= input.now) {
    return { ok: false, code: "PIQUE_CLOSED" };
  }
  return { ok: true };
}

export function canCastVote(input: {
  status: PiqueStatus;
  isParticipant: boolean;
  isProposer: boolean;
  alreadyVoted: boolean;
  votingEndsAt: Date;
  now: Date;
}):
  | { ok: true }
  | { ok: false; code: "PIQUE_CLOSED" | "NOT_PARTICIPANT" | "ALREADY_VOTED" | "INVALID_INPUT" } {
  if (input.status !== "pending_result" || input.votingEndsAt <= input.now) {
    return { ok: false, code: "PIQUE_CLOSED" };
  }
  if (!input.isParticipant) return { ok: false, code: "NOT_PARTICIPANT" };
  if (input.isProposer) return { ok: false, code: "INVALID_INPUT" };
  if (input.alreadyVoted) return { ok: false, code: "ALREADY_VOTED" };
  return { ok: true };
}

export function nextStatusWhenDeadlinePasses(
  status: PiqueStatus,
  participantCount: number,
): PiqueStatus {
  if (status !== "open") return status;
  return participantCount === 0 ? "cancelled" : "locked";
}

export function nextStatusWhenLastParticipantLeaves(
  participantCountAfterLeave: number,
): "open" | "cancelled" {
  return participantCountAfterLeave === 0 ? "cancelled" : "open";
}
