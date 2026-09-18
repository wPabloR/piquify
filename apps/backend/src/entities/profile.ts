export type Profile = {
  id: string;
  displayName: string;
  publicCode: number;
  balance: number;
  createdAt: Date;
};

export type AccountMovementKind =
  | "signup"
  | "pique_join"
  | "pique_leave"
  | "pique_win"
  | "pique_refund";

export type ProfileSearchHit = {
  id: string;
  displayName: string;
  publicCode: number;
  alreadyMember: boolean;
  invitePending: boolean;
};
