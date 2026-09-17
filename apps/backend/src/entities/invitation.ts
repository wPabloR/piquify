export type InvitationStatus = "pending" | "accepted" | "declined";

export type Invitation = {
  id: string;
  playgroundId: string;
  invitedUserId: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: Date;
};

export type ReceivedInvitation = {
  id: string;
  playgroundId: string;
  playgroundName: string;
  invitedByName: string;
  invitedByPublicCode: number;
  createdAt: Date;
};
