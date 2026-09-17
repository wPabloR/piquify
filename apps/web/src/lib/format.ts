export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function roleLabel(role: "admin" | "member") {
  return role === "admin" ? "Admin" : "Miembro";
}
