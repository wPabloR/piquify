import type { ReceivedInvitation } from "../../entities/invitation.js";
import type { AdminJoinRequest } from "../../entities/join-request.js";
import type {
  ResultDueNotification,
  ResultVoteNotification,
} from "../../entities/bet.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import { advanceBets } from "../bet/settle-bet.js";

export type NotificationInbox = {
  invitations: ReceivedInvitation[];
  joinRequests: AdminJoinRequest[];
  resultDue: ResultDueNotification[];
  resultVotes: ResultVoteNotification[];
};

export default class ListNotificationsUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly invitationDao: InvitationDao,
    private readonly joinRequestDao: JoinRequestDao,
    private readonly betDao: BetDao,
    private readonly profileDao: ProfileDao,
  ) {}

  async call(userId: string, now = new Date()): Promise<NotificationInbox> {
    const [invitations, mine] = await Promise.all([
      this.invitationDao.listPendingForUser(userId),
      this.playgroundDao.listForUser(userId),
    ]);

    const playgroundIds = mine.map((playground) => playground.id);
    const adminIds = mine
      .filter((playground) => playground.role === "admin")
      .map((playground) => playground.id);

    await advanceBets({
      betDao: this.betDao,
      profileDao: this.profileDao,
      now,
      filter: { playgroundIds },
    });

    const [joinRequests, resultDue, resultVotes] = await Promise.all([
      this.joinRequestDao.listPendingForPlaygrounds(adminIds),
      this.betDao.listLockedAwaitingResult(adminIds),
      this.betDao.listPendingResultVotesForUser(userId),
    ]);

    return { invitations, joinRequests, resultDue, resultVotes };
  }
}
