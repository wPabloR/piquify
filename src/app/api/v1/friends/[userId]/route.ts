import { isUuid, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { removeFriend } from "@/application/remove-friend";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  if (!isUuid(userId)) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) => removeFriend(uow, { actorId, userId }));
}
