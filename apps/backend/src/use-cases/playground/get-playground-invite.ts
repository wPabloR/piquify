import type { PlaygroundInvite } from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class GetPlaygroundInviteUseCase {
  constructor(private readonly playgroundDao: PlaygroundDao) {}

  async call(userId: string, token: string): Promise<PlaygroundInvite> {
    const playground = await this.playgroundDao.findByInviteToken(token);
    if (!playground) {
      throw new NotFoundError("Invite not found");
    }

    const role = await this.playgroundDao.findMembership(playground.id, userId);

    return {
      playgroundId: playground.id,
      name: playground.name,
      alreadyMember: role !== null,
    };
  }
}
