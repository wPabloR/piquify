import type {
  Invitation,
  InvitationStatus,
  ReceivedInvitation,
} from "../../entities/invitation.js";

export default interface InvitationDao {
  findById(id: string): Promise<Invitation | null>;
  findForPlaygroundUser(
    playgroundId: string,
    userId: string,
  ): Promise<Invitation | null>;
  listPendingUserIds(playgroundId: string): Promise<string[]>;
  listPendingForUser(userId: string): Promise<ReceivedInvitation[]>;
  create(input: {
    playgroundId: string;
    invitedUserId: string;
    invitedBy: string;
  }): Promise<Invitation>;
  updateStatus(
    id: string,
    status: InvitationStatus,
    invitedBy?: string,
  ): Promise<void>;
}
