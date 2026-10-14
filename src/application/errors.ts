const messages: Record<string, string> = {
  INVALID_INPUT: "Revisa los datos introducidos.",
  UNAUTHENTICATED: "Tu sesión ha caducado. Vuelve a entrar.",
  NOT_ADMIN: "Solo el admin puede hacer eso.",
  NOT_A_MEMBER: "No perteneces a este playground.",
  NOT_PARTICIPANT: "No participas en este pique.",
  NOT_FOUND: "No se ha encontrado.",
  USER_NOT_FOUND: "No hay ninguna cuenta con ese usuario.",
  ALREADY_MEMBER: "Esa persona ya está en el playground.",
  ALREADY_FRIENDS: "Ya sois amigos.",
  NOT_FRIENDS: "Solo puedes invitar a amigos por esta vía.",
  INVITE_EXISTS: "Ya hay una invitación pendiente.",
  REQUEST_EXISTS: "Ya enviaste una solicitud.",
  FRIEND_REQUEST_EXISTS: "Ya enviaste una solicitud.",
  PIQUE_CLOSED: "Este pique ya no admite cambios.",
  INSUFFICIENT_BALANCE: "No tienes puntos suficientes.",
  INVALID_OPTION: "Esa opción no pertenece al pique.",
  SUGGESTION_REQUIRED: "Si rechazas, elige la opción que propones.",
  VOTING_CLOSED: "La votación ya terminó.",
  ALREADY_VOTED: "Ya has votado este resultado.",
  LEDGER_IMMUTABLE: "El saldo no se puede corregir a mano.",
} as const;

export function translateError(message: string) {
  const code = message.split("\n")[0]?.trim() ?? "";
  return messages[code] ?? "No se ha podido completar la acción.";
}

export function safeErrorCode(message: string) {
  const code = message.split("\n")[0]?.trim() ?? "UNKNOWN";
  return /^[A-Z0-9_]+$/.test(code) ? code : "UNEXPECTED";
}

export function statusForCode(code: string) {
  if (code === "UNAUTHENTICATED") return 401;
  if (
    code === "NOT_ADMIN" ||
    code === "NOT_A_MEMBER" ||
    code === "NOT_PARTICIPANT" ||
    code === "NOT_FRIENDS"
  ) {
    return 403;
  }
  if (code === "NOT_FOUND" || code === "USER_NOT_FOUND") return 404;
  if (
    code === "ALREADY_MEMBER" ||
    code === "ALREADY_FRIENDS" ||
    code === "INVITE_EXISTS" ||
    code === "REQUEST_EXISTS" ||
    code === "FRIEND_REQUEST_EXISTS" ||
    code === "PIQUE_CLOSED" ||
    code === "INSUFFICIENT_BALANCE" ||
    code === "ALREADY_VOTED" ||
    code === "VOTING_CLOSED" ||
    code === "LEDGER_IMMUTABLE"
  ) {
    return 409;
  }
  return 422;
}

export function errorPayload(code: string) {
  return { error: { code, message: messages[code] ?? "No se ha podido completar la acción." } };
}
