import type { ReceivedInvitation } from "../../entities/invitation.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";

export default class ListPendingInvitationsUseCase {
  constructor(private readonly invitationDao: InvitationDao) {}

  call(userId: string): Promise<ReceivedInvitation[]> {
    return this.invitationDao.listPendingForUser(userId);
  }
}
