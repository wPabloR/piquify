import { isRecord, isUuid, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { invitePerson } from "@/application/invite-person";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return jsonError("INVALID_INPUT");
  const handle = typeof body.handle === "string" ? body.handle : undefined;
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  if (!handle && !userId) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) =>
    invitePerson(uow, { actorId, playgroundId: id, handle, userId }),
  );
}
