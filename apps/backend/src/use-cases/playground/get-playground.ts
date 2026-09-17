import type { PlaygroundDetail } from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class GetPlaygroundUseCase {
  constructor(private readonly playgroundDao: PlaygroundDao) {}

  async call(userId: string, playgroundId: string): Promise<PlaygroundDetail> {
    const playground = await this.playgroundDao.findById(playgroundId);
    if (!playground) {
      throw new NotFoundError("Playground not found");
    }

    const role = await this.playgroundDao.findMembership(playgroundId, userId);
    if (!role) {
      throw new NotFoundError("Playground not found");
    }

    const members = await this.playgroundDao.listMembers(playgroundId);

    return { ...playground, role, members };
  }
}
