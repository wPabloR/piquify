import { ForbiddenError, NotFoundError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class AcceptInvitationUseCase {
  constructor(
    private readonly invitationDao: InvitationDao,
    private readonly playgroundDao: PlaygroundDao,
  ) {}

  async call(
    userId: string,
    invitationId: string,
  ): Promise<{ playgroundId: string }> {
    const invitation = await this.invitationDao.findById(invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenError();
    }

    const membership = await this.playgroundDao.findMembership(
      invitation.playgroundId,
      userId,
    );
    if (!membership) {
      await this.playgroundDao.addMember(
        invitation.playgroundId,
        userId,
        "member",
      );
    }

    await this.invitationDao.updateStatus(invitation.id, "accepted");
    return { playgroundId: invitation.playgroundId };
  }
}
