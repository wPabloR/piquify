import { canCastVote } from "@/domain/access";
import { fail, ok, type AppResult } from "@/application/result";
import { settlePique } from "@/application/settle-pique";
import type { VoteDecision } from "@/domain/models";
import type { UnitOfWork } from "@/application/ports";

export async function voteResult(
  uow: UnitOfWork,
  input: {
    actorId: string;
    piqueId: string;
    decision: VoteDecision;
    suggestedOptionId: string | null;
    now?: Date;
  },
): Promise<AppResult> {
  const now = input.now ?? new Date();
  const pique = await uow.lockPique(input.piqueId);
  if (!pique) return fail("NOT_FOUND");
  if (await uow.hasVote(input.piqueId, input.actorId)) return fail("ALREADY_VOTED");
  const proposal = await uow.getProposal(input.piqueId);
  if (!proposal) return fail("NOT_FOUND");
  if (proposal.votingEndsAt <= now) {
    await settlePique(uow, { piqueId: pique.id, now });
    return fail("VOTING_CLOSED");
  }
  const participating = Boolean(await uow.getParticipation(input.piqueId, input.actorId));
  const allowed = canCastVote({
    status: pique.status,
    isParticipant: participating,
    isProposer: proposal.proposedBy === input.actorId,
    alreadyVoted: false,
    votingEndsAt: proposal.votingEndsAt,
    now,
  });
  if (!allowed.ok) return fail(allowed.code);
  if (input.decision === "reject" && input.suggestedOptionId) {
    if (!(await uow.optionExists(input.piqueId, input.suggestedOptionId))) {
      return fail("INVALID_OPTION");
    }
  }
  await uow.insertVote({
    piqueId: pique.id,
    userId: input.actorId,
    decision: input.decision,
    suggestedOptionId: input.decision === "reject" ? input.suggestedOptionId : null,
  });
  await uow.insertEvent({
    playgroundId: pique.playgroundId,
    actorId: input.actorId,
    piqueId: pique.id,
    kind: "result_voted",
  });
  await uow.touchPlayground(pique.playgroundId);
  await settlePique(uow, { piqueId: pique.id, now });
  return ok();
}
