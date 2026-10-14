import type { FriendPerson, UnitOfWork } from "@/application/ports";

export async function listInvitableFriends(
  uow: UnitOfWork,
  input: { actorId: string; playgroundId: string },
): Promise<FriendPerson[]> {
  const friends = await uow.listFriends(input.actorId);
  const invitable: FriendPerson[] = [];
  for (const friend of friends) {
    if (await uow.isMember(input.playgroundId, friend.id)) continue;
    if (await uow.pendingInvitationExists(input.playgroundId, friend.id)) continue;
    invitable.push(friend);
  }
  return invitable;
}
