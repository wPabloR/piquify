import type { Bet, BetDetail, BetSummary } from "../../entities/bet.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import type { ResultVoteChoice } from "@piquify/contracts";
import CreateBetUseCase from "../../use-cases/bet/create-bet.js";
import GetBetUseCase from "../../use-cases/bet/get-bet.js";
import JoinBetUseCase from "../../use-cases/bet/join-bet.js";
import LeaveBetUseCase from "../../use-cases/bet/leave-bet.js";
import SetBetResultUseCase from "../../use-cases/bet/set-bet-result.js";
import VoteBetResultUseCase from "../../use-cases/bet/vote-bet-result.js";

type Daos = {
  playgrounds: PlaygroundDao;
  bets: BetDao;
  profiles: ProfileDao;
};

export function serializeBetSummary(bet: BetSummary) {
  return {
    id: bet.id,
    playgroundId: bet.playgroundId,
    title: bet.title,
    stake: bet.stake,
    deadline: bet.deadline.toISOString(),
    status: bet.status,
    winningOptionId: bet.winningOptionId,
    voteClosesAt: bet.voteClosesAt?.toISOString() ?? null,
    createdBy: bet.createdBy,
    createdAt: bet.createdAt.toISOString(),
  };
}

export function serializeBet(bet: Bet) {
  return {
    ...serializeBetSummary(bet),
    options: bet.options.map((option) => ({
      id: option.id,
      label: option.label,
      position: option.position,
    })),
  };
}

export function serializeBetDetail(bet: BetDetail) {
  return {
    ...serializeBet(bet),
    myOptionId: bet.myOptionId,
    participantCount: bet.participantCount,
    payout: bet.payout,
    myVote: bet.myVote,
    confirmedCount: bet.confirmedCount,
    rejectedCount: bet.rejectedCount,
    pendingVoteCount: bet.pendingVoteCount,
  };
}

export default class BetController {
  constructor(private readonly createDaos: (accessToken: string) => Daos) {}

  async createBet(
    userId: string,
    accessToken: string,
    playgroundId: string,
    input: {
      title: string;
      stake: number;
      deadline: string;
      options: string[];
    },
  ) {
    const daos = this.createDaos(accessToken);
    const deadline = new Date(input.deadline);
    const bet = await new CreateBetUseCase(daos.playgrounds, daos.bets).call({
      actorId: userId,
      playgroundId,
      title: input.title,
      stake: input.stake,
      deadline,
      options: input.options,
    });
    return serializeBet(bet);
  }

  async getBet(
    userId: string,
    accessToken: string,
    playgroundId: string,
    betId: string,
  ) {
    const daos = this.createDaos(accessToken);
    const bet = await new GetBetUseCase(
      daos.playgrounds,
      daos.bets,
      daos.profiles,
    ).call(userId, playgroundId, betId);
    return serializeBetDetail(bet);
  }

  async joinBet(
    userId: string,
    accessToken: string,
    playgroundId: string,
    betId: string,
    optionId: string,
  ) {
    const daos = this.createDaos(accessToken);
    const bet = await new JoinBetUseCase(
      daos.playgrounds,
      daos.bets,
      daos.profiles,
    ).call({
      actorId: userId,
      playgroundId,
      betId,
      optionId,
    });
    return serializeBetDetail(bet);
  }

  async leaveBet(
    userId: string,
    accessToken: string,
    playgroundId: string,
    betId: string,
  ) {
    const daos = this.createDaos(accessToken);
    const bet = await new LeaveBetUseCase(
      daos.playgrounds,
      daos.bets,
      daos.profiles,
    ).call({
      actorId: userId,
      playgroundId,
      betId,
    });
    return serializeBetDetail(bet);
  }

  async setResult(
    userId: string,
    accessToken: string,
    playgroundId: string,
    betId: string,
    optionId: string,
  ) {
    const daos = this.createDaos(accessToken);
    const bet = await new SetBetResultUseCase(
      daos.playgrounds,
      daos.bets,
      daos.profiles,
    ).call({
      actorId: userId,
      playgroundId,
      betId,
      optionId,
    });
    return serializeBetDetail(bet);
  }

  async voteResult(
    userId: string,
    accessToken: string,
    playgroundId: string,
    betId: string,
    choice: ResultVoteChoice,
    suggestedOptionId: string | null,
  ) {
    const daos = this.createDaos(accessToken);
    const bet = await new VoteBetResultUseCase(
      daos.playgrounds,
      daos.bets,
      daos.profiles,
    ).call({
      actorId: userId,
      playgroundId,
      betId,
      choice,
      suggestedOptionId,
    });
    return serializeBetDetail(bet);
  }
}
