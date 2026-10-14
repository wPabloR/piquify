export type PiqueStatus =
  | "draft"
  | "open"
  | "locked"
  | "pending_result"
  | "resolved"
  | "cancelled";

export type PiqueKind = "options" | "date" | "number";
export type MemberRole = "admin" | "member";
export type VoteDecision = "approve" | "reject";

export interface FieldError {
  ok: false;
  code: "INVALID_INPUT";
  message: string;
}

export interface CreatePiqueInput {
  question: string;
  detail: string;
  kind: PiqueKind;
  stake: number;
  closesAt: string;
  options: string[];
}

export interface ValidCreatePiqueInput {
  question: string;
  detail: string | null;
  kind: PiqueKind;
  stake: number;
  closesAt: Date;
  options: string[];
}
