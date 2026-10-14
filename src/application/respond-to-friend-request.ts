import { orderedPair } from "@/domain/friends";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function respondToFriendRequest(
  uow: UnitOfWork,
  input: { actorId: string; requestId: string; accept: boolean },
): Promise<AppResult> {
  const request = await uow.lockFriendRequest(input.requestId);
  if (!request) return fail("NOT_FOUND");
  if (request.addresseeId !== input.actorId) return fail("NOT_FOUND");
  if (request.status !== "pending") return fail("NOT_FOUND");

  const [low, high] = orderedPair(request.requesterId, request.addresseeId);
  await uow.lockUser(low);
  await uow.lockUser(high);

  if (!input.accept) {
    await uow.setFriendRequestStatus(request.id, "declined");
    return ok();
  }

  await uow.setFriendRequestStatus(request.id, "accepted");
  await uow.insertFriendship(request.requesterId, request.addresseeId);
  await uow.insertNotification({
    userId: request.requesterId,
    actorId: input.actorId,
    body: "Han aceptado tu solicitud de amistad.",
    kind: "friend_accepted",
  });
  return ok();
}
