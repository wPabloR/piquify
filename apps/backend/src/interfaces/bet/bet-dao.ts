import type { BetStatus, ResultVoteChoice } from "@piquify/contracts";
import type {
  Bet,
  BetParticipant,
  BetResultVote,
  BetSummary,
  ResultDueNotification,
  ResultVoteNotification,
} from "../../entities/bet.js";

export type BetLifecycleFilter = {
  playgroundId?: string;
  playgroundIds?: string[];
  betId?: string;
};

export default interface BetDao {
  create(input: {
    playgroundId: string;
    createdBy: string;
    title: string;
    stake: number;
    deadline: Date;
    options: string[];
  }): Promise<Bet>;
  findById(id: string): Promise<Bet | null>;
  listForPlayground(playgroundId: string): Promise<BetSummary[]>;
  lockExpired(now: Date, filter: BetLifecycleFilter): Promise<void>;
  proposeResult(
    betId: string,
    optionId: string,
    voteClosesAt: Date,
  ): Promise<Bet>;
  setResult(betId: string, optionId: string): Promise<Bet>;
  setStatus(betId: string, status: BetStatus): Promise<void>;
  listParticipants(betId: string): Promise<BetParticipant[]>;
  addParticipant(input: {
    betId: string;
    userId: string;
    optionId: string;
  }): Promise<void>;
  removeParticipant(betId: string, userId: string): Promise<void>;
  listVotes(betId: string): Promise<BetResultVote[]>;
  upsertVote(input: {
    betId: string;
    userId: string;
    choice: ResultVoteChoice;
    suggestedOptionId: string | null;
  }): Promise<void>;
  listLockedAwaitingResult(
    playgroundIds: string[],
  ): Promise<ResultDueNotification[]>;
  listPendingResultVotesForUser(
    userId: string,
  ): Promise<ResultVoteNotification[]>;
  listExpiredPendingResults(
    now: Date,
    filter: BetLifecycleFilter,
  ): Promise<Bet[]>;
  isSettled(betId: string): Promise<boolean>;
  markSettled(betId: string): Promise<void>;
  saveResidual(input: {
    playgroundId: string;
    betId: string;
    amount: number;
    memberIds: string[];
  }): Promise<void>;
}
