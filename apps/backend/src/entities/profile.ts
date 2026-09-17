export type Profile = {
  id: string;
  displayName: string;
  publicCode: number;
  createdAt: Date;
};

export type ProfileSearchHit = {
  id: string;
  displayName: string;
  publicCode: number;
  alreadyMember: boolean;
  invitePending: boolean;
};
