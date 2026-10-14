import { fail, ok, type AppResult } from "@/application/result";
import { settlePique } from "@/application/settle-pique";
import type { UnitOfWork } from "@/application/ports";

export async function proposeResult(
  uow: UnitOfWork,
  input: { actorId: string; piqueId: string; optionId: string; now?: Date },
): Promise<AppResult> {
  const pique = await uow.lockPique(input.piqueId);
  if (!pique) return fail("NOT_FOUND");
  if (pique.status !== "locked") return fail("PIQUE_CLOSED");
  const role = await uow.memberRole(pique.playgroundId, input.actorId);
  if (role !== "admin") return fail("NOT_ADMIN");
  if (!(await uow.optionExists(input.piqueId, input.optionId))) return fail("INVALID_OPTION");
  const votingEndsAt = new Date((input.now ?? new Date()).getTime() + 48 * 60 * 60 * 1000);
  await uow.insertProposal({
    piqueId: pique.id,
    optionId: input.optionId,
    proposedBy: input.actorId,
    votingEndsAt,
  });
  await uow.updatePiqueStatus(pique.id, "pending_result");
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    piqueId: pique.id,
    kind: "result_proposed",
  });
  await uow.notifyMembers({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    body: `Vota el resultado de: ${pique.question}`,
    kind: "vote_open",
    piqueId: pique.id,
  });
  await uow.touchPlayground(pique.playgroundId);
  await settlePique(uow, { piqueId: pique.id, now: input.now });
  return ok();
}
