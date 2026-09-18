import type { BetStatus, ResultVoteChoice } from "@piquify/contracts";

export type { BetStatus, ResultVoteChoice };

export type BetOption = {
  id: string;
  label: string;
  position: number;
};

export type BetSummary = {
  id: string;
  playgroundId: string;
  title: string;
  stake: number;
  deadline: Date;
  status: BetStatus;
  winningOptionId: string | null;
  voteClosesAt: Date | null;
  createdBy: string;
  createdAt: Date;
};

export type BetParticipant = {
  userId: string;
  optionId: string;
};

export type BetResultVote = {
  userId: string;
  choice: ResultVoteChoice;
  suggestedOptionId: string | null;
};

export type Bet = BetSummary & {
  options: BetOption[];
};

export type BetDetail = Bet & {
  myOptionId: string | null;
  participantCount: number;
  payout: BetPayout | null;
  myVote: ResultVoteChoice | null;
  confirmedCount: number;
  rejectedCount: number;
  pendingVoteCount: number;
};

export type BetPayout = {
  pot: number;
  winnerCount: number;
  share: number;
  residual: number;
  refund: number;
};

export type ResultDueNotification = {
  betId: string;
  playgroundId: string;
  playgroundName: string;
  title: string;
  deadline: Date;
};

export type ResultVoteNotification = {
  betId: string;
  playgroundId: string;
  playgroundName: string;
  title: string;
  voteClosesAt: Date;
  proposedOptionLabel: string;
};
