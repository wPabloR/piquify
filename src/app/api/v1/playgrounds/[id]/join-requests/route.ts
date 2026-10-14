import { isUuid, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { requestAccess } from "@/application/request-access";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) =>
    requestAccess(uow, { actorId, playgroundId: id }),
  );
}
