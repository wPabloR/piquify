import { orderedPair } from "@/domain/friends";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function removeFriend(
  uow: UnitOfWork,
  input: { actorId: string; userId: string },
): Promise<AppResult> {
  if (input.actorId === input.userId) return fail("INVALID_INPUT");
  const [low, high] = orderedPair(input.actorId, input.userId);
  await uow.lockUser(low);
  await uow.lockUser(high);
  if (!(await uow.friendshipExists(input.actorId, input.userId))) return fail("NOT_FOUND");
  await uow.deleteFriendship(input.actorId, input.userId);
  return ok();
}
