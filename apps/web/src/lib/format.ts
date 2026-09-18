export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function roleLabel(role: "admin" | "member") {
  return role === "admin" ? "Admin" : "Miembro";
}

export function formatPublicCode(code: number) {
  return `#${code}`;
}

export function formatStake(stake: number) {
  return stake === 1 ? "1 punto" : `${stake} puntos`;
}

export function betStatusLabel(
  status: "open" | "locked" | "pending_result" | "resolved" | "cancelled",
) {
  switch (status) {
    case "open":
      return "Abierto";
    case "locked":
      return "Cerrado";
    case "pending_result":
      return "Por confirmar";
    case "resolved":
      return "Resuelto";
    case "cancelled":
      return "Cancelado";
  }
}
