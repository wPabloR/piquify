import type { PlaygroundSummary } from "../../entities/playground.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class ListPlaygroundsUseCase {
  constructor(private readonly playgroundDao: PlaygroundDao) {}

  async call(userId: string): Promise<PlaygroundSummary[]> {
    return this.playgroundDao.listForUser(userId);
  }
}
