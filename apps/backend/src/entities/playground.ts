export const PLAYGROUND_NAME_MAX_LENGTH = 80;

export type PlaygroundRole = "admin" | "member";

export type Playground = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  inviteToken: string;
};

export type PlaygroundSummary = Omit<Playground, "inviteToken"> & {
  role: PlaygroundRole;
};

export type PlaygroundMember = {
  userId: string;
  displayName: string;
  role: PlaygroundRole;
  joinedAt: Date;
};

export type PlaygroundDetail = Playground & {
  role: PlaygroundRole;
  members: PlaygroundMember[];
};

export type PlaygroundInvite = {
  playgroundId: string;
  name: string;
  alreadyMember: boolean;
};
