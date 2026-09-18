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
import ListNotificationsUseCase from "../../use-cases/notification/list-notifications.js";
import AcceptInvitationUseCase from "../../use-cases/invitation/accept-invitation.js";
import DeclineInvitationUseCase from "../../use-cases/invitation/decline-invitation.js";
import InviteToPlaygroundUseCase from "../../use-cases/playground/invite-to-playground.js";
import SearchProfilesUseCase from "../../use-cases/user/search-profiles.js";

type Daos = {
  playgrounds: PlaygroundDao;
  profiles: ProfileDao;
  invitations: InvitationDao;
  joinRequests: JoinRequestDao;
  bets: BetDao;
};

function serializeReceivedInvitation(invitation: ReceivedInvitation) {
  return {
    id: invitation.id,
    playgroundId: invitation.playgroundId,
    playgroundName: invitation.playgroundName,
    invitedByName: invitation.invitedByName,
    invitedByPublicCode: invitation.invitedByPublicCode,
    createdAt: invitation.createdAt.toISOString(),
  };
}

function serializeAdminJoinRequest(request: AdminJoinRequest) {
  return {
    id: request.id,
    playgroundId: request.playgroundId,
    playgroundName: request.playgroundName,
    userId: request.userId,
    displayName: request.displayName,
    publicCode: request.publicCode,
    createdAt: request.createdAt.toISOString(),
  };
}

function serializeResultDue(item: ResultDueNotification) {
  return {
    betId: item.betId,
    playgroundId: item.playgroundId,
    playgroundName: item.playgroundName,
    title: item.title,
    deadline: item.deadline.toISOString(),
  };
}

function serializeResultVote(item: ResultVoteNotification) {
  return {
    betId: item.betId,
    playgroundId: item.playgroundId,
    playgroundName: item.playgroundName,
    title: item.title,
    voteClosesAt: item.voteClosesAt.toISOString(),
    proposedOptionLabel: item.proposedOptionLabel,
  };
}

export default class InvitationController {
  constructor(private readonly createDaos: (accessToken: string) => Daos) {}

  async searchProfiles(
    userId: string,
    accessToken: string,
    playgroundId: string,
    query: string,
  ) {
    const daos = this.createDaos(accessToken);
    const hits = await new SearchProfilesUseCase(
      daos.playgrounds,
      daos.profiles,
      daos.invitations,
    ).call({ actorId: userId, playgroundId, query });

    return hits.map((hit) => ({
      id: hit.id,
      displayName: hit.displayName,
      publicCode: hit.publicCode,
      alreadyMember: hit.alreadyMember,
      invitePending: hit.invitePending,
    }));
  }

  async invite(
    userId: string,
    accessToken: string,
    playgroundId: string,
    invitedUserId: string,
  ) {
    const daos = this.createDaos(accessToken);
    await new InviteToPlaygroundUseCase(
      daos.playgrounds,
      daos.profiles,
      daos.invitations,
    ).call({ actorId: userId, playgroundId, invitedUserId });
  }

  async listMine(userId: string, accessToken: string) {
    const daos = this.createDaos(accessToken);
    const inbox = await new ListNotificationsUseCase(
      daos.playgrounds,
      daos.invitations,
      daos.joinRequests,
      daos.bets,
      daos.profiles,
    ).call(userId);

    return {
      invitations: inbox.invitations.map(serializeReceivedInvitation),
      joinRequests: inbox.joinRequests.map(serializeAdminJoinRequest),
      resultDue: inbox.resultDue.map(serializeResultDue),
      resultVotes: inbox.resultVotes.map(serializeResultVote),
    };
  }

  async accept(userId: string, accessToken: string, invitationId: string) {
    const daos = this.createDaos(accessToken);
    return new AcceptInvitationUseCase(daos.invitations, daos.playgrounds).call(
      userId,
      invitationId,
    );
  }

  async decline(userId: string, accessToken: string, invitationId: string) {
    const daos = this.createDaos(accessToken);
    await new DeclineInvitationUseCase(daos.invitations).call(
      userId,
      invitationId,
    );
  }
}
