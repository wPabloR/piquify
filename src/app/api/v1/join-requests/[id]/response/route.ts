import { isRecord, isUuid, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { respondToJoinRequest } from "@/application/respond-to-join-request";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.accept !== "boolean") return jsonError("INVALID_INPUT");
  const accept = body.accept;
  return mutate(request, (uow, actorId) =>
    respondToJoinRequest(uow, { actorId, requestId: id, accept }),
  );
}
