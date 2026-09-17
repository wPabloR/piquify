export type JoinRequestStatus = "pending" | "accepted" | "declined";

export type JoinRequest = {
  id: string;
  playgroundId: string;
  userId: string;
  status: JoinRequestStatus;
  createdAt: Date;
};

export type AdminJoinRequest = {
  id: string;
  playgroundId: string;
  playgroundName: string;
  userId: string;
  displayName: string;
  publicCode: number;
  createdAt: Date;
};
