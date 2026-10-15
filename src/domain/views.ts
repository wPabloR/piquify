import type { FriendRelation } from "@/domain/friends";
import type { PiqueStatus } from "@/domain/models";
import type { LedgerKind, NotificationKind, SearchAccess } from "@/domain/presentation";

export interface Viewer {
  id: string;
  name: string;
  handle: string;
  friendCode: string;
  points: number;
  notifications: number;
  streak: number;
  accuracy: number;
}

export interface ProfileStats {
  played: number;
  won: number;
  accuracy: number;
  streak: number;
  net: number;
}

export interface AttentionItem {
  kind: "vote" | "propose" | "closing";
  piqueId: string;
  playgroundId: string;
  question: string;
  playgroundName: string;
  dueLabel: string;
  href: string;
}

export interface LedgerMovementView {
  id: string;
  kind: LedgerKind;
  amount: number;
  label: string;
  playgroundName: string | null;
  question: string | null;
  href: string | null;
  when: string;
}

export interface FriendListItem {
  id: string;
  name: string;
  handle: string;
}

export interface SearchPersonView {
  id: string;
  name: string;
  handle: string;
  relation: FriendRelation;
  incomingRequestId: string | null;
}

export interface HeadToHeadView {
  friend: FriendListItem;
  sharedPlaygrounds: { id: string; name: string; emoji: string }[];
  myWins: number;
  theirWins: number;
  myNet: number;
  theirNet: number;
  piques: {
    id: string;
    playgroundId: string;
    playgroundName: string;
    question: string;
    myWin: boolean;
    theirWin: boolean;
  }[];
}

export interface PlaygroundSummary {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  openPiques: number;
  myRank: number;
  memberCount: number;
  pot: number;
  lastActivity: string;
  unread: number;
  members: { id: string; name: string; points: number }[];
  publicCode: string;
  isAdmin: boolean;
}

export interface PiqueOptionView {
  id: string;
  label: string;
  backers: string[];
  share: number | null;
}

export interface PiqueView {
  id: string;
  question: string;
  detail: string | null;
  status: PiqueStatus;
  closesLabel: string;
  createdBy: string;
  stake: number;
  hot: boolean;
  options: PiqueOptionView[];
  myOptionId: string | null;
  winningOptionIds: string[];
  canLeave: boolean;
  canPropose: boolean;
  canVote: boolean;
  proposalLabel: string | null;
  participantCount: number;
}

export interface AccessItem {
  id: string;
  playgroundName: string;
  personName: string;
  kind: "invitation" | "request" | "own_request" | "friend_incoming" | "friend_outgoing";
}

export interface ActivityItem {
  id: string;
  who: string;
  body: string;
  when: string;
  href: string | null;
}

export interface SearchPlaygroundView {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  access: SearchAccess;
}

export interface PlaygroundEventView {
  id: string;
  who: string;
  body: string;
  when: string;
  href: string | null;
}

export type { NotificationKind, SearchAccess };
