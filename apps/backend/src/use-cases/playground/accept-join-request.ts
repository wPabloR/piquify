import { ForbiddenError, NotFoundError } from "../../errors/http-error.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class AcceptJoinRequestUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly joinRequestDao: JoinRequestDao,
  ) {}

  async call(actorId: string, requestId: string): Promise<void> {
    const request = await this.joinRequestDao.findById(requestId);
    if (!request || request.status !== "pending") {
      throw new NotFoundError("Join request not found");
    }

    const role = await this.playgroundDao.findMembership(
      request.playgroundId,
      actorId,
    );
    if (role !== "admin") {
      throw new ForbiddenError();
    }

    const membership = await this.playgroundDao.findMembership(
      request.playgroundId,
      request.userId,
    );
    if (!membership) {
      await this.playgroundDao.addMember(
        request.playgroundId,
        request.userId,
        "member",
      );
    }

    await this.joinRequestDao.updateStatus(request.id, "accepted");
  }
}
