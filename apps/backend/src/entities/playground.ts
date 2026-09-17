export const PLAYGROUND_NAME_MAX_LENGTH = 80;

export type PlaygroundRole = "admin" | "member";

export type Playground = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
};

export type PlaygroundSummary = Playground & {
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
