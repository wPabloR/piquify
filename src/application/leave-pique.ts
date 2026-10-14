import { canLeave, nextStatusWhenLastParticipantLeaves } from "@/domain/access";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function leavePique(
  uow: UnitOfWork,
  input: { actorId: string; piqueId: string; now?: Date },
): Promise<AppResult> {
  const now = input.now ?? new Date();
  await uow.lockUser(input.actorId);
  const pique = await uow.lockPique(input.piqueId);
  if (!pique) return fail("NOT_FOUND");
  const participating = Boolean(await uow.getParticipation(input.piqueId, input.actorId));
  const decision = canLeave({
    status: pique.status,
    closesAt: pique.closesAt,
    now,
    participating,
  });
  if (!decision.ok) return fail(decision.code);
  await uow.deleteParticipation(input.piqueId, input.actorId);
  await uow.insertLedger({
    userId: input.actorId,
    amount: pique.stake,
    kind: "stake_refund",
    playgroundId: pique.playgroundId,
    piqueId: pique.id,
  });
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    piqueId: pique.id,
    kind: "pique_left",
  });
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    subjectUserId: input.actorId,
    piqueId: pique.id,
    kind: "stake_refund",
    amount: pique.stake,
  });
  const remaining = await uow.countParticipations(input.piqueId);
  if (nextStatusWhenLastParticipantLeaves(remaining) === "cancelled") {
    await uow.updatePiqueStatus(pique.id, "cancelled");
    await uow.insertEvent({
      playgroundId: pique.playgroundId,
      actorId: input.actorId,
      piqueId: pique.id,
      kind: "pique_cancelled",
    });
  }
  await uow.touchPlayground(pique.playgroundId);
  return ok();
}
