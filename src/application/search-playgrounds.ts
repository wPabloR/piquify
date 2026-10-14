import type { UnitOfWork } from "@/application/ports";

export async function searchPlaygrounds(
  uow: UnitOfWork,
  input: { actorId: string; query: string },
) {
  const needle = input.query.trim();
  if (needle.length < 2) return [];
  return uow.searchPlaygrounds(input.actorId, needle);
}
