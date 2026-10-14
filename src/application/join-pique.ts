import { canJoin } from "@/domain/access";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function joinPique(
  uow: UnitOfWork,
  input: { actorId: string; piqueId: string; optionId: string; now?: Date },
): Promise<AppResult> {
  const now = input.now ?? new Date();
  await uow.lockUser(input.actorId);
  const pique = await uow.lockPique(input.piqueId);
  if (!pique) return fail("NOT_FOUND");
  if (!(await uow.optionExists(input.piqueId, input.optionId))) return fail("INVALID_OPTION");
  const already = await uow.getParticipation(input.piqueId, input.actorId);
  await uow.lockLedger(input.actorId);
  const decision = canJoin({
    isMember: await uow.isMember(pique.playgroundId, input.actorId),
    status: pique.status,
    closesAt: pique.closesAt,
    now,
    balance: await uow.balance(input.actorId),
    stake: pique.stake,
    alreadyParticipating: Boolean(already),
  });
  if (!decision.ok) return fail(decision.code);
  if (decision.mode === "change") {
    await uow.setParticipation(input.piqueId, input.actorId, input.optionId);
    await uow.insertEvent({
      playgroundId: pique.playgroundId,
      actorId: input.actorId,
      piqueId: pique.id,
      kind: "option_changed",
    });
    await uow.touchPlayground(pique.playgroundId);
    return ok();
  }
  await uow.insertParticipation(input.piqueId, input.actorId, input.optionId);
  await uow.insertLedger({
    userId: input.actorId,
    amount: -pique.stake,
    kind: "stake_hold",
    playgroundId: pique.playgroundId,
    piqueId: pique.id,
  });
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    piqueId: pique.id,
    kind: "pique_joined",
  });
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    subjectUserId: input.actorId,
    piqueId: pique.id,
    kind: "stake_hold",
    amount: -pique.stake,
  });
  await uow.notifyMembers({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    body: `Nueva participación en: ${pique.question}`,
    kind: "participation",
    piqueId: pique.id,
  });
  await uow.touchPlayground(pique.playgroundId);
  return ok();
}
