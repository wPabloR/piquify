import { decideWinners } from "@/domain/settlement";
import { applicableResidual, combinePot, splitIntegerPot } from "@/domain/money";
import { participantKey } from "@/domain/participants";
import { ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function settlePique(
  uow: UnitOfWork,
  input: { piqueId: string; now?: Date },
): Promise<AppResult> {
  const now = input.now ?? new Date();
  const pique = await uow.lockPique(input.piqueId);
  if (!pique || pique.status !== "pending_result") return ok();
  const proposal = await uow.getProposal(input.piqueId);
  if (!proposal) return ok();
  const participations = await uow.listParticipations(input.piqueId);
  const participantIds = participations.map((item) => item.userId);
  if (participantIds.length === 0) return ok();
  const votes = await uow.listVotes(input.piqueId);
  const decision = decideWinners({
    participantIds,
    proposerId: proposal.proposedBy,
    proposedOptionId: proposal.optionId,
    votes: votes.map((vote) => ({
      userId: vote.userId,
      decision: vote.decision,
      suggestedOptionId: vote.suggestedOptionId ?? undefined,
    })),
    votingClosed: proposal.votingEndsAt <= now,
  });
  if (decision.state === "pending") return ok();

  const key = participantKey(participantIds);
  await uow.lockResiduals(pique.playgroundId, key);
  const residuals = await uow.openResiduals(pique.playgroundId, key);
  const residualAmount = applicableResidual(residuals, participantIds);
  const pot = combinePot(pique.stake, participantIds.length, residualAmount);
  const winners = participations
    .filter((item) => decision.winnerOptionIds.includes(item.optionId))
    .map((item) => item.userId);
  const uniqueWinners = [...new Set(winners)];
  let share = 0;
  let leftover = pot;
  if (uniqueWinners.length > 0) {
    const split = splitIntegerPot(pot, uniqueWinners.length);
    share = split.share;
    leftover = split.residual;
  }
  if (share > 0) {
    for (const userId of uniqueWinners) {
      await uow.insertLedger({
        userId,
        amount: share,
        kind: "payout",
        playgroundId: pique.playgroundId,
        piqueId: pique.id,
      });
      await uow.insertEvent({
        playgroundId: pique.playgroundId,
        actorId: userId,
        subjectUserId: userId,
        piqueId: pique.id,
        kind: "payout",
        amount: share,
      });
    }
  }
  await uow.consumeResiduals(pique.playgroundId, key, pique.id);
  if (leftover > 0) {
    await uow.insertResidual({
      playgroundId: pique.playgroundId,
      amount: leftover,
      participantKey: key,
      participantIds,
      sourcePiqueId: pique.id,
    });
  }
  await uow.insertWinners(pique.id, decision.winnerOptionIds);
  await uow.updatePiqueStatus(pique.id, "resolved", now);
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: proposal.proposedBy,
    piqueId: pique.id,
    kind: "pique_resolved",
  });
  await uow.notifyMembers({
    playgroundId: pique.playgroundId,
    actorId: proposal.proposedBy,
    body: `Resultado listo: ${pique.question}`,
    kind: "resolved",
    piqueId: pique.id,
  });
  await uow.touchPlayground(pique.playgroundId);
  return ok();
}
