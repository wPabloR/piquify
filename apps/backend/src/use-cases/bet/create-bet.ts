import {
  BET_MAX_OPTIONS,
  BET_MIN_OPTIONS,
  BET_MIN_STAKE,
  BET_OPTION_LABEL_MAX_LENGTH,
  BET_TITLE_MAX_LENGTH,
} from "@piquify/contracts";
import type { Bet } from "../../entities/bet.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

function normalizeOptions(options: string[]): string[] {
  const labels = options.map((option) => option.trim()).filter(Boolean);

  if (labels.length < BET_MIN_OPTIONS) {
    throw new ValidationError(
      `Un pique necesita al menos ${BET_MIN_OPTIONS} opciones`,
    );
  }
  if (labels.length > BET_MAX_OPTIONS) {
    throw new ValidationError(
      `Un pique admite como mucho ${BET_MAX_OPTIONS} opciones`,
    );
  }

  for (const label of labels) {
    if (label.length > BET_OPTION_LABEL_MAX_LENGTH) {
      throw new ValidationError(
        `Cada opción debe tener como mucho ${BET_OPTION_LABEL_MAX_LENGTH} caracteres`,
      );
    }
  }

  const unique = new Set(labels.map((label) => label.toLowerCase()));
  if (unique.size !== labels.length) {
    throw new ValidationError("Las opciones no pueden repetirse");
  }

  return labels;
}

export default class CreateBetUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly betDao: BetDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    title: string;
    stake: number;
    deadline: Date;
    options: string[];
    now?: Date;
  }): Promise<Bet> {
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

    const title = input.title.trim();
    if (!title) {
      throw new ValidationError("El título es obligatorio");
    }
    if (title.length > BET_TITLE_MAX_LENGTH) {
      throw new ValidationError(
        `El título debe tener como mucho ${BET_TITLE_MAX_LENGTH} caracteres`,
      );
    }

    if (!Number.isInteger(input.stake) || input.stake < BET_MIN_STAKE) {
      throw new ValidationError(
        `La apuesta debe ser un entero de al menos ${BET_MIN_STAKE} punto`,
      );
    }

    if (Number.isNaN(input.deadline.getTime())) {
      throw new ValidationError("La fecha límite no es válida");
    }

    const now = input.now ?? new Date();
    if (input.deadline.getTime() <= now.getTime()) {
      throw new ValidationError("La fecha límite debe ser futura");
    }

    return this.betDao.create({
      playgroundId: input.playgroundId,
      createdBy: input.actorId,
      title,
      stake: input.stake,
      deadline: input.deadline,
      options: normalizeOptions(input.options),
    });
  }
}
