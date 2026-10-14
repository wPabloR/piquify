import { jsonError, isUuid, mutate } from "@/app/api/v1/_lib/http";
import { joinPique } from "@/application/join-pique";
import { leavePique } from "@/application/leave-pique";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = (await request.json().catch(() => null)) as { optionId?: string } | null;
  const optionId = body?.optionId;
  if (!optionId || !isUuid(optionId)) {
    return jsonError("INVALID_INPUT");
  }
  return mutate(request, (uow, actorId) =>
    joinPique(uow, { actorId, piqueId: id, optionId }),
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) => leavePique(uow, { actorId, piqueId: id }));
}
