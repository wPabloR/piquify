import { resultVoteClosesAt } from "@piquify/contracts";
import type { BetDetail } from "../../entities/bet.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import GetBetUseCase from "./get-bet.js";
import {
  advanceBets,
  settleResolvedBet,
  tryFinalizeBetResult,
} from "./settle-bet.js";

export default class SetBetResultUseCase {
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
    if (role !== "admin") {
      throw new ForbiddenError();
    }

    const now = input.now ?? new Date();
    await advanceBets({
      betDao: this.betDao,
      profileDao: this.profileDao,
      now,
      filter: { playgroundId: input.playgroundId, betId: input.betId },
    });

    const bet = await this.betDao.findById(input.betId);
    if (!bet || bet.playgroundId !== input.playgroundId) {
      throw new NotFoundError("Pique no encontrado");
    }

    if (bet.status === "cancelled") {
      throw new ValidationError("Este pique está cancelado");
    }

    if (bet.status === "pending_result") {
      throw new ValidationError(
        "Ya hay un resultado propuesto. Espera a la validación.",
      );
    }

    const settled = await this.betDao.isSettled(bet.id);
    if (bet.status === "resolved") {
      if (settled) {
        throw new ValidationError("Este pique ya está resuelto");
      }
      await settleResolvedBet({
        betDao: this.betDao,
        profileDao: this.profileDao,
        bet,
      });
      return this.reload(input.actorId, input.playgroundId, bet.id, now);
    }

    if (bet.status !== "locked") {
      throw new ValidationError(
        "El pique sigue abierto. Espera a la fecha límite.",
      );
    }

    if (!bet.options.some((option) => option.id === input.optionId)) {
      throw new ValidationError("Esa opción no pertenece a este pique");
    }

    const proposed = await this.betDao.proposeResult(
      bet.id,
      input.optionId,
      resultVoteClosesAt(now),
    );
    const participants = await this.betDao.listParticipants(bet.id);
    if (participants.some((participant) => participant.userId === input.actorId)) {
      await this.betDao.upsertVote({
        betId: bet.id,
        userId: input.actorId,
        choice: "confirm",
        suggestedOptionId: null,
      });
    }

    await tryFinalizeBetResult({
      betDao: this.betDao,
      profileDao: this.profileDao,
      bet: proposed,
      now,
    });

    return this.reload(input.actorId, input.playgroundId, bet.id, now);
  }

  private reload(
    actorId: string,
    playgroundId: string,
    betId: string,
    now: Date,
  ) {
    return new GetBetUseCase(
      this.playgroundDao,
      this.betDao,
      this.profileDao,
    ).call(actorId, playgroundId, betId, now);
  }
}
