import { orderedPair, parseFriendCode } from "@/domain/friends";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function sendFriendRequest(
  uow: UnitOfWork,
  input: { actorId: string; code?: string; userId?: string },
): Promise<AppResult> {
  const otherId = await resolveTarget(uow, input);
  if (!otherId.ok) return otherId;
  if (otherId.value === input.actorId) return fail("INVALID_INPUT");

  const [low, high] = orderedPair(input.actorId, otherId.value);
  await uow.lockUser(low);
  await uow.lockUser(high);

  if (await uow.friendshipExists(input.actorId, otherId.value)) return fail("ALREADY_FRIENDS");
  if (await uow.pendingFriendRequest(input.actorId, otherId.value)) {
    return fail("FRIEND_REQUEST_EXISTS");
  }

  const inverse = await uow.pendingFriendRequest(otherId.value, input.actorId);
  if (inverse) {
    await uow.setFriendRequestStatus(inverse.id, "accepted");
    await uow.insertFriendship(input.actorId, otherId.value);
    await uow.insertNotification({
      userId: otherId.value,
      actorId: input.actorId,
      body: "Ahora sois amigos.",
      kind: "friend_accepted",
    });
    return ok();
  }

  await uow.insertFriendRequest(input.actorId, otherId.value);
  await uow.insertNotification({
    userId: otherId.value,
    actorId: input.actorId,
    body: "Nueva solicitud de amistad.",
    kind: "friend_request",
  });
  return ok();
}

async function resolveTarget(
  uow: UnitOfWork,
  input: { code?: string; userId?: string },
): Promise<AppResult<string>> {
  if (input.userId) {
    const profile = await uow.profileById(input.userId);
    if (!profile) return fail("USER_NOT_FOUND");
    return ok(profile.id);
  }
  if (!input.code) return fail("INVALID_INPUT");
  const parsed = parseFriendCode(input.code);
  if (!parsed.ok) return fail(parsed.code);
  const profile = await uow.profileByFriendCode(parsed.value);
  if (!profile) return fail("USER_NOT_FOUND");
  return ok(profile.id);
}
