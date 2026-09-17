import {
  PLAYGROUND_NAME_MAX_LENGTH,
  type Playground,
} from "../../entities/playground.js";
import { ValidationError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class CreatePlaygroundUseCase {
  constructor(private readonly playgroundDao: PlaygroundDao) {}

  async call(userId: string, name: string): Promise<Playground> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new ValidationError("El nombre es obligatorio");
    }
    if (trimmed.length > PLAYGROUND_NAME_MAX_LENGTH) {
      throw new ValidationError(
        `El nombre debe tener como mucho ${PLAYGROUND_NAME_MAX_LENGTH} caracteres`,
      );
    }

    return this.playgroundDao.create({ name: trimmed, createdBy: userId });
  }
}
