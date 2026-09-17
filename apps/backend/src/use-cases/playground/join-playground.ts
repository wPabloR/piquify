import { NotFoundError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class JoinPlaygroundUseCase {
  constructor(private readonly playgroundDao: PlaygroundDao) {}

  async call(userId: string, token: string): Promise<{ playgroundId: string }> {
    const playground = await this.playgroundDao.findByInviteToken(token);
    if (!playground) {
      throw new NotFoundError("Invite not found");
    }

    const role = await this.playgroundDao.findMembership(playground.id, userId);
    if (!role) {
      await this.playgroundDao.addMember(playground.id, userId, "member");
    }

    return { playgroundId: playground.id };
  }
}
