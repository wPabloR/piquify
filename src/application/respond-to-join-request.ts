import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function respondToJoinRequest(
  uow: UnitOfWork,
  input: { actorId: string; requestId: string; accept: boolean },
): Promise<AppResult> {
  const request = await uow.lockJoinRequest(input.requestId);
  if (!request || request.status !== "pending") return fail("NOT_FOUND");
  const role = await uow.memberRole(request.playgroundId, input.actorId);
  if (role !== "admin") return fail("NOT_ADMIN");
  await uow.setJoinRequestStatus(request.id, input.accept ? "accepted" : "declined");
  if (input.accept) {
    await uow.declinePendingInvitations(request.playgroundId, request.userId);
    if (!(await uow.isMember(request.playgroundId, request.userId))) {
      await uow.addMember(request.playgroundId, request.userId, "member");
      await uow.insertEvent({
        playgroundId: request.playgroundId,
        actorId: request.userId,
        subjectUserId: request.userId,
        kind: "member_joined",
      });
      await uow.notifyMembers({
        playgroundId: request.playgroundId,
        actorId: request.userId,
        body: "Hay una nueva incorporación.",
        kind: "membership",
      });
    }
  }
  await uow.insertNotification({
    userId: request.userId,
    playgroundId: request.playgroundId,
    actorId: input.actorId,
    body: input.accept ? "Tu solicitud fue aceptada." : "Tu solicitud fue rechazada.",
    kind: "join_decision",
  });
  await uow.touchPlayground(request.playgroundId);
  return ok();
}
