import type { ResultVoteChoice } from "@piquify/contracts";
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
import { advanceBets, settleResolvedBet, tryFinalizeBetResult } from "./settle-bet.js";

export default class VoteBetResultUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly betDao: BetDao,
    private readonly profileDao: ProfileDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    betId: string;
    choice: ResultVoteChoice;
    suggestedOptionId?: string | null;
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
    await advanceBets({
      betDao: this.betDao,
      profileDao: this.profileDao,
      now,
      filter: { playgroundId: input.playgroundId, betId: input.betId },
    });

    let bet = await this.betDao.findById(input.betId);
    if (!bet || bet.playgroundId !== input.playgroundId) {
      throw new NotFoundError("Pique no encontrado");
    }

    if (bet.status === "resolved") {
      await settleResolvedBet({
        betDao: this.betDao,
        profileDao: this.profileDao,
        bet,
      });
      return new GetBetUseCase(
        this.playgroundDao,
        this.betDao,
        this.profileDao,
      ).call(input.actorId, input.playgroundId, bet.id, now);
    }

    if (bet.status !== "pending_result" || !bet.winningOptionId) {
      throw new ValidationError("Este pique no está pendiente de validación");
    }

    const participants = await this.betDao.listParticipants(bet.id);
    if (!participants.some((participant) => participant.userId === input.actorId)) {
      throw new ForbiddenError();
    }

    let suggestedOptionId: string | null = null;
    if (input.choice === "reject") {
      suggestedOptionId = input.suggestedOptionId ?? null;
      if (!suggestedOptionId) {
        throw new ValidationError("Si rechazas, sugiere la opción ganadora");
      }
      if (suggestedOptionId === bet.winningOptionId) {
        throw new ValidationError("Sugiere una opción distinta a la propuesta");
      }
      if (!bet.options.some((option) => option.id === suggestedOptionId)) {
        throw new ValidationError("Esa opción no pertenece a este pique");
      }
    }

    await this.betDao.upsertVote({
      betId: bet.id,
      userId: input.actorId,
      choice: input.choice,
      suggestedOptionId,
    });

    await tryFinalizeBetResult({
      betDao: this.betDao,
      profileDao: this.profileDao,
      bet,
      now,
    });

    return new GetBetUseCase(
      this.playgroundDao,
      this.betDao,
      this.profileDao,
    ).call(input.actorId, input.playgroundId, bet.id, now);
  }
}
