import type { BetSummary } from "./bet.js";

export const PLAYGROUND_NAME_MAX_LENGTH = 80;

export type PlaygroundRole = "admin" | "member";

export type Playground = {
  id: string;
  name: string;
  publicCode: number;
  createdBy: string;
  createdAt: Date;
  inviteToken: string;
};

export type PlaygroundSearchHit = {
  id: string;
  name: string;
  publicCode: number;
  alreadyMember: boolean;
  requestPending: boolean;
};

export type PlaygroundJoinRequest = {
  id: string;
  userId: string;
  displayName: string;
  publicCode: number;
  createdAt: Date;
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
  joinRequests: PlaygroundJoinRequest[];
  bets: BetSummary[];
};

export type PlaygroundInvite = {
  playgroundId: string;
  name: string;
  alreadyMember: boolean;
};
