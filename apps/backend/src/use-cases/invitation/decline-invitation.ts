import { ForbiddenError, NotFoundError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";

export default class DeclineInvitationUseCase {
  constructor(private readonly invitationDao: InvitationDao) {}

  async call(userId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationDao.findById(invitationId);
    if (!invitation || invitation.status !== "pending") {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenError();
    }

    await this.invitationDao.updateStatus(invitation.id, "declined");
  }
}
