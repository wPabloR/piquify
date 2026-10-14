import { parseHandle } from "@/domain/validation";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function invitePerson(
  uow: UnitOfWork,
  input: { actorId: string; playgroundId: string; handle?: string; userId?: string },
): Promise<AppResult> {
  const role = await uow.memberRole(input.playgroundId, input.actorId);
  if (role !== "admin") return fail("NOT_ADMIN");
  const inviteeId = await resolveInvitee(uow, input);
  if (!inviteeId.ok) return inviteeId;
  if (inviteeId.value === input.actorId) return fail("INVALID_INPUT");
  if (await uow.isMember(input.playgroundId, inviteeId.value)) return fail("ALREADY_MEMBER");
  if (await uow.pendingInvitationExists(input.playgroundId, inviteeId.value)) {
    return fail("INVITE_EXISTS");
  }
  await uow.insertInvitation(input.playgroundId, input.actorId, inviteeId.value);
  await uow.insertNotification({
    userId: inviteeId.value,
    playgroundId: input.playgroundId,
    actorId: input.actorId,
    body: "Te han invitado a un playground.",
    kind: "invitation",
  });
  await uow.touchPlayground(input.playgroundId);
  return ok();
}

async function resolveInvitee(
  uow: UnitOfWork,
  input: { actorId: string; handle?: string; userId?: string },
): Promise<AppResult<string>> {
  if (input.userId) {
    if (!(await uow.friendshipExists(input.actorId, input.userId))) return fail("NOT_FRIENDS");
    const profile = await uow.profileById(input.userId);
    if (!profile) return fail("USER_NOT_FOUND");
    return ok(profile.id);
  }
  if (!input.handle) return fail("INVALID_INPUT");
  const handle = parseHandle(input.handle);
  if (!handle.ok) return fail(handle.code);
  const invitee = await uow.profileByHandle(handle.value);
  if (!invitee) return fail("USER_NOT_FOUND");
  return ok(invitee.id);
}
