import type { ReceivedInvitation } from "../../entities/invitation.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import AcceptInvitationUseCase from "../../use-cases/invitation/accept-invitation.js";
import DeclineInvitationUseCase from "../../use-cases/invitation/decline-invitation.js";
import ListPendingInvitationsUseCase from "../../use-cases/invitation/list-pending-invitations.js";
import InviteToPlaygroundUseCase from "../../use-cases/playground/invite-to-playground.js";
import SearchProfilesUseCase from "../../use-cases/user/search-profiles.js";

type Daos = {
  playgrounds: PlaygroundDao;
  profiles: ProfileDao;
  invitations: InvitationDao;
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
    const invitations = await new ListPendingInvitationsUseCase(
      daos.invitations,
    ).call(userId);
    return invitations.map(serializeReceivedInvitation);
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
