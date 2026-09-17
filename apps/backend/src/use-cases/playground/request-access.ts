import { NotFoundError, ValidationError } from "../../errors/http-error.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class RequestAccessUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly joinRequestDao: JoinRequestDao,
  ) {}

  async call(userId: string, playgroundId: string): Promise<void> {
    const playground = await this.playgroundDao.findById(playgroundId);
    if (!playground) {
      throw new NotFoundError("Playground not found");
    }

    const membership = await this.playgroundDao.findMembership(
      playgroundId,
      userId,
    );
    if (membership) {
      throw new ValidationError("Ya eres miembro de este playground");
    }

    const existing = await this.joinRequestDao.findForPlaygroundUser(
      playgroundId,
      userId,
    );

    if (!existing) {
      await this.joinRequestDao.create({ playgroundId, userId });
      return;
    }

    if (existing.status === "pending") {
      return;
    }

    await this.joinRequestDao.updateStatus(existing.id, "pending");
  }
}
