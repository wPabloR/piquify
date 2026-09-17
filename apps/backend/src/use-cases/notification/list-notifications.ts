import type { ReceivedInvitation } from "../../entities/invitation.js";
import type { AdminJoinRequest } from "../../entities/join-request.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export type NotificationInbox = {
  invitations: ReceivedInvitation[];
  joinRequests: AdminJoinRequest[];
};

export default class ListNotificationsUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly invitationDao: InvitationDao,
    private readonly joinRequestDao: JoinRequestDao,
  ) {}

  async call(userId: string): Promise<NotificationInbox> {
    const [invitations, mine] = await Promise.all([
      this.invitationDao.listPendingForUser(userId),
      this.playgroundDao.listForUser(userId),
    ]);

    const adminIds = mine
      .filter((playground) => playground.role === "admin")
      .map((playground) => playground.id);

    const joinRequests =
      await this.joinRequestDao.listPendingForPlaygrounds(adminIds);

    return { invitations, joinRequests };
  }
}
