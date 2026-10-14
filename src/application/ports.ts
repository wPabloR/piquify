import type { MemberRole, PiqueKind, PiqueStatus, VoteDecision } from "@/domain/models";

export type NotificationKind =
  | "invitation"
  | "join_request"
  | "join_decision"
  | "membership"
  | "pique_opened"
  | "participation"
  | "vote_open"
  | "resolved"
  | "friend_request"
  | "friend_accepted";

export type PlaygroundEventKind =
  | "member_joined"
  | "pique_created"
  | "pique_joined"
  | "option_changed"
  | "pique_left"
  | "pique_cancelled"
  | "pique_locked"
  | "result_proposed"
  | "result_voted"
  | "pique_resolved"
  | "stake_hold"
  | "stake_refund"
  | "payout";

export interface PiqueRecord {
  id: string;
  playgroundId: string;
  question: string;
  detail: string | null;
  kind: PiqueKind;
  status: PiqueStatus;
  stake: number;
  closesAt: Date;
  createdBy: string;
}

export interface ProposalRecord {
  piqueId: string;
  optionId: string;
  proposedBy: string;
  votingEndsAt: Date;
}

export interface VoteRecord {
  userId: string;
  decision: VoteDecision;
  suggestedOptionId: string | null;
}

export interface ResidualRecord {
  id: string;
  amount: number;
  participantIds: string[];
}

export interface SearchPlaygroundRecord {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  access: "member" | "pending_request" | "none";
}

export interface SearchPersonRecord {
  id: string;
  name: string;
  handle: string;
  isFriend: boolean;
  pendingFromActor: boolean;
  pendingFromOther: boolean;
  incomingRequestId: string | null;
}

export interface FriendPerson {
  id: string;
  name: string;
  handle: string;
}

export interface PendingFriendRequestRecord {
  id: string;
  personId: string;
  name: string;
  handle: string;
  direction: "incoming" | "outgoing";
}

export interface UnitOfWork {
  lockUser(userId: string): Promise<void>;
  lockPique(id: string): Promise<PiqueRecord | null>;
  insertPique(input: {
    playgroundId: string;
    question: string;
    detail: string | null;
    kind: PiqueKind;
    stake: number;
    closesAt: Date;
    createdBy: string;
  }): Promise<string>;
  updatePiqueStatus(id: string, status: PiqueStatus, resolvedAt?: Date): Promise<void>;
  listExpiredOpenPiques(): Promise<{ id: string; playgroundId: string; participantCount: number }[]>;
  listExpiredVotingPiqueIds(): Promise<string[]>;
  isMember(playgroundId: string, userId: string): Promise<boolean>;
  memberRole(playgroundId: string, userId: string): Promise<MemberRole | null>;
  addMember(playgroundId: string, userId: string, role: MemberRole): Promise<void>;
  listMemberIds(playgroundId: string): Promise<string[]>;
  optionExists(piqueId: string, optionId: string): Promise<boolean>;
  insertOptions(piqueId: string, labels: string[]): Promise<void>;
  getParticipation(piqueId: string, userId: string): Promise<{ optionId: string } | null>;
  setParticipation(piqueId: string, userId: string, optionId: string): Promise<void>;
  insertParticipation(piqueId: string, userId: string, optionId: string): Promise<void>;
  deleteParticipation(piqueId: string, userId: string): Promise<void>;
  listParticipations(piqueId: string): Promise<{ userId: string; optionId: string }[]>;
  countParticipations(piqueId: string): Promise<number>;
  lockLedger(userId: string): Promise<void>;
  balance(userId: string): Promise<number>;
  insertLedger(input: {
    userId: string;
    amount: number;
    kind: "stake_hold" | "stake_refund" | "payout";
    playgroundId: string;
    piqueId: string;
  }): Promise<void>;
  insertProposal(input: {
    piqueId: string;
    optionId: string;
    proposedBy: string;
    votingEndsAt: Date;
  }): Promise<void>;
  getProposal(piqueId: string): Promise<ProposalRecord | null>;
  hasVote(piqueId: string, userId: string): Promise<boolean>;
  insertVote(input: {
    piqueId: string;
    userId: string;
    decision: VoteDecision;
    suggestedOptionId: string | null;
  }): Promise<void>;
  listVotes(piqueId: string): Promise<VoteRecord[]>;
  insertWinners(piqueId: string, optionIds: string[]): Promise<void>;
  lockResiduals(playgroundId: string, participantKey: string): Promise<void>;
  openResiduals(playgroundId: string, participantKey: string): Promise<ResidualRecord[]>;
  consumeResiduals(playgroundId: string, participantKey: string, piqueId: string): Promise<void>;
  insertResidual(input: {
    playgroundId: string;
    amount: number;
    participantKey: string;
    participantIds: string[];
    sourcePiqueId: string;
  }): Promise<void>;
  insertEvent(input: {
    playgroundId: string;
    actorId: string | null;
    subjectUserId?: string | null;
    piqueId?: string | null;
    kind: PlaygroundEventKind;
    amount?: number | null;
  }): Promise<void>;
  notifyMembers(input: {
    playgroundId: string;
    actorId: string;
    body: string;
    kind: NotificationKind;
    piqueId?: string | null;
  }): Promise<void>;
  insertNotification(input: {
    userId: string;
    playgroundId?: string | null;
    actorId: string;
    body: string;
    kind: NotificationKind;
    piqueId?: string | null;
  }): Promise<void>;
  markNotificationsRead(userId: string): Promise<void>;
  profileById(userId: string): Promise<{
    id: string;
    name: string;
    handle: string;
    friendCode: string;
  } | null>;
  profileByHandle(handle: string): Promise<{ id: string } | null>;
  profileByFriendCode(code: string): Promise<{ id: string; name: string; handle: string } | null>;
  insertProfile(input: { id: string; name: string; handle: string; friendCode: string }): Promise<void>;
  insertOpeningBalance(userId: string): Promise<void>;
  updateDisplayName(userId: string, name: string): Promise<void>;
  insertPlayground(input: {
    name: string;
    tagline: string;
    emoji: string;
    adminId: string;
  }): Promise<string>;
  playgroundById(id: string): Promise<{ id: string; publicCode: string; adminId: string } | null>;
  playgroundByCode(code: string): Promise<{ id: string; adminId: string } | null>;
  touchPlayground(id: string): Promise<void>;
  searchPlaygrounds(userId: string, query: string): Promise<SearchPlaygroundRecord[]>;
  searchPeople(userId: string, query: string): Promise<SearchPersonRecord[]>;
  friendshipExists(userA: string, userB: string): Promise<boolean>;
  pendingFriendRequest(fromId: string, toId: string): Promise<{ id: string } | null>;
  insertFriendRequest(requesterId: string, addresseeId: string): Promise<string>;
  lockFriendRequest(id: string): Promise<{
    id: string;
    requesterId: string;
    addresseeId: string;
    status: string;
  } | null>;
  setFriendRequestStatus(id: string, status: "accepted" | "declined"): Promise<void>;
  insertFriendship(userA: string, userB: string): Promise<void>;
  deleteFriendship(userA: string, userB: string): Promise<void>;
  listFriends(userId: string): Promise<FriendPerson[]>;
  listPendingFriendRequests(userId: string): Promise<PendingFriendRequestRecord[]>;
  pendingInvitationExists(playgroundId: string, inviteeId: string): Promise<boolean>;
  insertInvitation(playgroundId: string, inviterId: string, inviteeId: string): Promise<string>;
  lockInvitation(id: string): Promise<{
    id: string;
    playgroundId: string;
    inviteeId: string;
    status: string;
  } | null>;
  setInvitationStatus(id: string, status: "accepted" | "declined"): Promise<void>;
  declinePendingInvitations(playgroundId: string, inviteeId: string): Promise<void>;
  pendingRequestExists(playgroundId: string, userId: string): Promise<boolean>;
  insertJoinRequest(playgroundId: string, userId: string): Promise<string>;
  lockJoinRequest(id: string): Promise<{
    id: string;
    playgroundId: string;
    userId: string;
    status: string;
  } | null>;
  setJoinRequestStatus(id: string, status: "accepted" | "declined"): Promise<void>;
  declinePendingRequests(playgroundId: string, userId: string): Promise<void>;
}
