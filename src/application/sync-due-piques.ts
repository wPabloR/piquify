import { nextStatusWhenDeadlinePasses } from "@/domain/access";
import { settlePique } from "@/application/settle-pique";
import { withUnitOfWork } from "@/infrastructure/postgres-stores";

export async function syncDuePiques() {
  await withUnitOfWork(async (uow) => {
    const expired = await uow.listExpiredOpenPiques();
    for (const pique of expired) {
      const status = nextStatusWhenDeadlinePasses("open", pique.participantCount);
      await uow.updatePiqueStatus(pique.id, status);
      await uow.insertEvent({
        playgroundId: pique.playgroundId,
        actorId: null,
        piqueId: pique.id,
        kind: status === "cancelled" ? "pique_cancelled" : "pique_locked",
      });
      await uow.touchPlayground(pique.playgroundId);
    }
    const pending = await uow.listExpiredVotingPiqueIds();
    for (const piqueId of pending) {
      await settlePique(uow, { piqueId });
    }
  });
}
