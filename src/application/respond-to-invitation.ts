import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function respondToInvitation(
  uow: UnitOfWork,
  input: { actorId: string; invitationId: string; accept: boolean },
): Promise<AppResult> {
  const invitation = await uow.lockInvitation(input.invitationId);
  if (!invitation || invitation.inviteeId !== input.actorId || invitation.status !== "pending") {
    return fail("NOT_FOUND");
  }
  await uow.setInvitationStatus(invitation.id, input.accept ? "accepted" : "declined");
  if (!input.accept) return ok();
  await uow.declinePendingRequests(invitation.playgroundId, input.actorId);
  if (!(await uow.isMember(invitation.playgroundId, input.actorId))) {
    await uow.addMember(invitation.playgroundId, input.actorId, "member");
    await uow.insertEvent({
      playgroundId: invitation.playgroundId,
      actorId: input.actorId,
      subjectUserId: input.actorId,
      kind: "member_joined",
    });
    await uow.notifyMembers({
      playgroundId: invitation.playgroundId,
      actorId: input.actorId,
      body: "Hay una nueva incorporación.",
      kind: "membership",
    });
  }
  await uow.touchPlayground(invitation.playgroundId);
  return ok();
}
