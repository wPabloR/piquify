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

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export default class JoinBetUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly betDao: BetDao,
    private readonly profileDao: ProfileDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    betId: string;
    optionId: string;
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
      throw new ValidationError("Este pique ya no admite participantes");
    }

    if (!bet.options.some((option) => option.id === input.optionId)) {
      throw new ValidationError("Esa opción no pertenece a este pique");
    }

    const alreadyIn = (await this.betDao.listParticipants(bet.id)).some(
      (participant) => participant.userId === input.actorId,
    );
    if (alreadyIn) {
      throw new ValidationError("Ya estás en este pique");
    }

    const profile = await this.profileDao.findById(input.actorId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }
    if (profile.balance < bet.stake) {
      throw new ValidationError("No tienes suficientes puntos");
    }

    try {
      await this.betDao.addParticipant({
        betId: bet.id,
        userId: input.actorId,
        optionId: input.optionId,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ValidationError("Ya estás en este pique");
      }
      throw error;
    }

    const debited = await this.profileDao.tryDebit(input.actorId, bet.stake);
    if (!debited) {
      await this.betDao.removeParticipant(bet.id, input.actorId);
      throw new ValidationError("No tienes suficientes puntos");
    }

    try {
      await this.profileDao.appendMovement({
        userId: input.actorId,
        amount: -bet.stake,
        kind: "pique_join",
        betId: bet.id,
      });
    } catch (error) {
      await this.profileDao.credit(input.actorId, bet.stake);
      await this.betDao.removeParticipant(bet.id, input.actorId);
      throw error;
    }

    return new GetBetUseCase(this.playgroundDao, this.betDao, this.profileDao).call(
      input.actorId,
      input.playgroundId,
      bet.id,
      now,
    );
  }
}
