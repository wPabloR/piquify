import type { PiqueStatus } from "@/domain/models";

export type AuthField = "name" | "handle" | "email" | "password";

export interface AuthFormSnapshot {
  values: { name?: string; handle?: string; email?: string };
  fieldErrors: Partial<Record<AuthField, string>>;
  error?: string;
}

export type NotificationKind =
  | "invitation"
  | "join_request"
  | "join_decision"
  | "membership"
  | "pique_opened"
  | "participation"
  | "vote_open"
  | "resolved"
  | "friend_request"
  | "friend_accepted";

export type SearchAccess = "member" | "pending_request" | "none";

export interface SearchPlaygroundHit {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  access: SearchAccess;
}

export function authFormSnapshot(input: {
  name?: string;
  handle?: string;
  email?: string;
  password?: string;
  errors: Partial<Record<AuthField, string>>;
  formError?: string;
}): AuthFormSnapshot {
  return {
    values: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.handle !== undefined ? { handle: input.handle } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
    },
    fieldErrors: input.errors,
    error: input.formError,
  };
}

export const CONFIRM_EMAIL_MESSAGE =
  "Revisa tu correo para confirmar la cuenta antes de entrar.";

export function isUnconfirmedEmail(error: { code?: string; message?: string }) {
  return error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message ?? "");
}

export function credentialFailure(email: string): AuthFormSnapshot {
  const message = "Revisa el correo y la contraseña.";
  return {
    values: { email },
    fieldErrors: { email: message, password: message },
    error: message,
  };
}

export function activityHref(item: {
  kind: NotificationKind | null;
  playgroundId: string | null;
  piqueId: string | null;
}): string | null {
  if (
    item.kind === "invitation" ||
    item.kind === "join_request" ||
    item.kind === "friend_request" ||
    item.kind === "friend_accepted"
  ) {
    return "/invitations";
  }
  if (item.kind === "join_decision" && !item.playgroundId) return "/invitations";
  if (item.piqueId && item.playgroundId) {
    return `/playgrounds/${item.playgroundId}#pique-${item.piqueId}`;
  }
  if (item.playgroundId) return `/playgrounds/${item.playgroundId}`;
  return null;
}

export function piqueFilterForHash(
  piques: { id: string; status: PiqueStatus }[],
  hash: string,
): PiqueStatus | "all" {
  const prefix = "#pique-";
  if (!hash.startsWith(prefix)) return "open";
  const found = piques.find((pique) => pique.id === hash.slice(prefix.length));
  if (!found) return "open";
  if (found.status === "draft" || found.status === "cancelled") return "all";
  return found.status;
}

export function optionShare(status: PiqueStatus, backers: number, participants: number): number | null {
  if (status !== "resolved") return null;
  if (participants <= 0) return 0;
  return Math.round((backers * 100) / participants);
}

export type LedgerKind = "opening_balance" | "stake_hold" | "stake_refund" | "payout";

const LEDGER_KINDS: readonly LedgerKind[] = [
  "opening_balance",
  "stake_hold",
  "stake_refund",
  "payout",
];

export function parseLedgerKind(value: string): LedgerKind {
  const kind = LEDGER_KINDS.find((item) => item === value);
  if (!kind) throw new Error("INVALID_RESPONSE");
  return kind;
}

export function ledgerMovementLabel(kind: LedgerKind): string {
  const labels: Record<LedgerKind, string> = {
    opening_balance: "Saldo inicial",
    stake_hold: "Stake puesto en juego",
    stake_refund: "Stake devuelto",
    payout: "Premio",
  };
  return labels[kind];
}

export function historyLabel(kind: string): string {
  const labels: Record<string, string> = {
    member_joined: "se ha unido al playground.",
    pique_created: "ha publicado un pique.",
    pique_joined: "ha entrado en un pique.",
    option_changed: "ha cambiado de opción.",
    pique_left: "ha salido de un pique.",
    pique_cancelled: "El pique se ha cancelado.",
    pique_locked: "El pique se ha cerrado.",
    result_proposed: "ha propuesto un resultado.",
    result_voted: "ha votado el resultado.",
    pique_resolved: "El pique se ha resuelto.",
    stake_hold: "ha puesto puntos en juego.",
    stake_refund: "ha recuperado el stake.",
    payout: "ha recibido el premio.",
  };
  return labels[kind] ?? "ha actualizado el playground.";
}
