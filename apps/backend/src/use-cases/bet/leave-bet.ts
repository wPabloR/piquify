import { effectiveBetStatus } from "@piquify/contracts";
import type { BetDetail } from "../../entities/bet.js";
import {
  NotFoundError,
  ValidationError,
} from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import GetBetUseCase from "./get-bet.js";

export default class LeaveBetUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly betDao: BetDao,
    private readonly profileDao: ProfileDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    betId: string;
    now?: Date;
  }): Promise<BetDetail> {
    const role = await this.playgroundDao.findMembership(
      input.playgroundId,
      input.actorId,
    );
    if (!role) {
      throw new NotFoundError("Playground not found");
    }

    const now = input.now ?? new Date();
    await this.betDao.lockExpired(now, {
      playgroundId: input.playgroundId,
      betId: input.betId,
    });

    const bet = await this.betDao.findById(input.betId);
    if (!bet || bet.playgroundId !== input.playgroundId) {
      throw new NotFoundError("Pique no encontrado");
    }

    if (effectiveBetStatus(bet.status, bet.deadline, now) !== "open") {
      throw new ValidationError("Ya no puedes salir de este pique");
    }

    const participants = await this.betDao.listParticipants(bet.id);
    const mine = participants.find(
      (participant) => participant.userId === input.actorId,
    );
    if (!mine) {
      throw new ValidationError("No estás en este pique");
    }

    await this.betDao.removeParticipant(bet.id, input.actorId);

    try {
      await this.profileDao.credit(input.actorId, bet.stake);
    } catch (error) {
      await this.betDao.addParticipant({
        betId: bet.id,
        userId: input.actorId,
        optionId: mine.optionId,
      });
      throw error;
    }

    try {
      await this.profileDao.appendMovement({
        userId: input.actorId,
        amount: bet.stake,
        kind: "pique_leave",
        betId: bet.id,
      });
    } catch (error) {
      await this.profileDao.tryDebit(input.actorId, bet.stake);
      await this.betDao.addParticipant({
        betId: bet.id,
        userId: input.actorId,
        optionId: mine.optionId,
      });
      throw error;
    }

    if (participants.length === 1) {
      await this.betDao.setStatus(bet.id, "cancelled");
    }

    return new GetBetUseCase(this.playgroundDao, this.betDao, this.profileDao).call(
      input.actorId,
      input.playgroundId,
      bet.id,
      now,
    );
  }
}
