import type { FieldError } from "@/domain/models";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const codePattern = /^[0-9A-HJKMNP-TV-Z]{8}$/;

export const FRIEND_CODE_LENGTH = 8;

export type FriendRelation = "friend" | "outgoing" | "incoming" | "none";

export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function friendRelation(input: {
  isFriend: boolean;
  pendingFromActor: boolean;
  pendingFromOther: boolean;
}): FriendRelation {
  if (input.isFriend) return "friend";
  if (input.pendingFromActor) return "outgoing";
  if (input.pendingFromOther) return "incoming";
  return "none";
}

export function friendCodeFromBytes(bytes: Uint8Array): string {
  if (bytes.length < FRIEND_CODE_LENGTH) throw new Error("INVALID_INPUT");
  let code = "";
  for (let index = 0; index < FRIEND_CODE_LENGTH; index += 1) {
    code += alphabet[(bytes[index] ?? 0) % alphabet.length];
  }
  return code;
}

export function generateFriendCode(): string {
  return friendCodeFromBytes(crypto.getRandomValues(new Uint8Array(FRIEND_CODE_LENGTH)));
}

export function parseFriendCode(value: string): { ok: true; value: string } | FieldError {
  const code = value.replace(/[\s-]/g, "").toUpperCase();
  if (!codePattern.test(code)) {
    return { ok: false, code: "INVALID_INPUT", message: "El código tiene 8 letras o números." };
  }
  return { ok: true, value: code };
}
