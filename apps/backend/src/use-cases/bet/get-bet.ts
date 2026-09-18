import { effectiveBetStatus } from "@piquify/contracts";
import type { BetDetail } from "../../entities/bet.js";
import { NotFoundError } from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import { payoutFor } from "./payout.js";
import { advanceBets, settleResolvedBet, tryFinalizeBetResult } from "./settle-bet.js";

export default class GetBetUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly betDao: BetDao,
    private readonly profileDao: ProfileDao,
  ) {}

  async call(
    userId: string,
    playgroundId: string,
    betId: string,
    now = new Date(),
  ): Promise<BetDetail> {
    const role = await this.playgroundDao.findMembership(playgroundId, userId);
    if (!role) {
      throw new NotFoundError("Playground not found");
    }

    await advanceBets({
      betDao: this.betDao,
      profileDao: this.profileDao,
      now,
      filter: { playgroundId, betId },
    });
    let bet = await this.betDao.findById(betId);
    if (!bet || bet.playgroundId !== playgroundId) {
      throw new NotFoundError("Pique no encontrado");
    }

    if (bet.status === "pending_result") {
      bet = await tryFinalizeBetResult({
        betDao: this.betDao,
        profileDao: this.profileDao,
        bet,
        now,
      });
      bet = (await this.betDao.findById(bet.id)) ?? bet;
    } else if (bet.status === "resolved") {
      await settleResolvedBet({
        betDao: this.betDao,
        profileDao: this.profileDao,
        bet,
      });
      bet = (await this.betDao.findById(bet.id)) ?? bet;
    }

    const [participants, votes] = await Promise.all([
      this.betDao.listParticipants(bet.id),
      this.betDao.listVotes(bet.id),
    ]);
    const status = effectiveBetStatus(bet.status, bet.deadline, now);

    return {
      ...bet,
      status,
      myOptionId:
        participants.find((participant) => participant.userId === userId)
          ?.optionId ?? null,
      participantCount: participants.length,
      payout: payoutFor(status, bet.stake, bet.winningOptionId, participants),
      myVote: votes.find((vote) => vote.userId === userId)?.choice ?? null,
      confirmedCount: votes.filter((vote) => vote.choice === "confirm").length,
      rejectedCount: votes.filter((vote) => vote.choice === "reject").length,
      pendingVoteCount: Math.max(0, participants.length - votes.length),
    };
  }
}
