import { resolveProposedResult } from "@piquify/contracts";
import type { Bet } from "../../entities/bet.js";
import type { AccountMovementKind } from "../../entities/profile.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type { BetLifecycleFilter } from "../../interfaces/bet/bet-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import { payoutFor } from "./payout.js";

export async function advanceBets(input: {
  betDao: BetDao;
  profileDao: ProfileDao;
  now: Date;
  filter: BetLifecycleFilter;
}): Promise<void> {
  await input.betDao.lockExpired(input.now, input.filter);
  const expired = await input.betDao.listExpiredPendingResults(
    input.now,
    input.filter,
  );
  for (const bet of expired) {
    await tryFinalizeBetResult({
      betDao: input.betDao,
      profileDao: input.profileDao,
      bet,
      now: input.now,
    });
  }
}

export async function tryFinalizeBetResult(input: {
  betDao: BetDao;
  profileDao: ProfileDao;
  bet: Bet;
  now: Date;
}): Promise<Bet> {
  if (input.bet.status !== "pending_result" || !input.bet.winningOptionId) {
    return input.bet;
  }

  const [participants, votes] = await Promise.all([
    input.betDao.listParticipants(input.bet.id),
    input.betDao.listVotes(input.bet.id),
  ]);

  const outcome = resolveProposedResult({
    proposedOptionId: input.bet.winningOptionId,
    participantIds: participants.map((participant) => participant.userId),
    votes,
    now: input.now,
    voteClosesAt: input.bet.voteClosesAt ?? input.now,
  });

  if (!outcome) {
    return input.bet;
  }

  const resolved: Bet = {
    ...input.bet,
    status: "resolved",
    winningOptionId: outcome.winningOptionId,
  };
  await settleResolvedBet({
    betDao: input.betDao,
    profileDao: input.profileDao,
    bet: resolved,
  });
  return (await input.betDao.findById(input.bet.id)) ?? resolved;
}

export async function settleResolvedBet(input: {
  betDao: BetDao;
  profileDao: ProfileDao;
  bet: Bet;
}): Promise<void> {
  const winningOptionId = input.bet.winningOptionId;
  if (!winningOptionId) {
    return;
  }

  const settled = await input.betDao.isSettled(input.bet.id);
  if (settled) {
    return;
  }

  const participants = await input.betDao.listParticipants(input.bet.id);
  const payout = payoutFor(
    "resolved",
    input.bet.stake,
    winningOptionId,
    participants,
  );

  if (payout && payout.share > 0) {
    const winners = participants.filter(
      (participant) => participant.optionId === winningOptionId,
    );
    for (const winner of winners) {
      await creditOnce(input.profileDao, {
        userId: winner.userId,
        betId: input.bet.id,
        amount: payout.share,
        kind: "pique_win",
      });
    }
  }

  if (payout && payout.refund > 0) {
    for (const participant of participants) {
      await creditOnce(input.profileDao, {
        userId: participant.userId,
        betId: input.bet.id,
        amount: payout.refund,
        kind: "pique_refund",
      });
    }
  }

  if (payout && payout.residual > 0) {
    await input.betDao.saveResidual({
      playgroundId: input.bet.playgroundId,
      betId: input.bet.id,
      amount: payout.residual,
      memberIds: participants.map((participant) => participant.userId),
    });
  }

  await input.betDao.setResult(input.bet.id, winningOptionId);
  await input.betDao.markSettled(input.bet.id);
}

async function creditOnce(
  profileDao: ProfileDao,
  input: {
    userId: string;
    betId: string;
    amount: number;
    kind: Extract<AccountMovementKind, "pique_win" | "pique_refund">;
  },
) {
  const alreadyPaid = await profileDao.hasMovement({
    userId: input.userId,
    betId: input.betId,
    kind: input.kind,
  });
  if (alreadyPaid) {
    return;
  }

  await profileDao.credit(input.userId, input.amount);
  try {
    await profileDao.appendMovement({
      userId: input.userId,
      amount: input.amount,
      kind: input.kind,
      betId: input.betId,
    });
  } catch (error) {
    await profileDao.tryDebit(input.userId, input.amount);
    throw error;
  }
}
