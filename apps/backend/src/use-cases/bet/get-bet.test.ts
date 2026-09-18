import { describe, expect, it } from "vitest";
import type { Bet, BetSummary } from "../../entities/bet.js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import type { Profile } from "../../entities/profile.js";
import GetBetUseCase from "./get-bet.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  publicCode: 1000,
  createdBy: "admin-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
};

const openBet: Bet = {
  id: "bet-1",
  playgroundId: "pg-1",
  title: "El clásico",
  stake: 10,
  deadline: new Date("2026-09-18T12:00:00.000Z"),
  status: "open",
  winningOptionId: null,
  voteClosesAt: null,
  createdBy: "admin-1",
  createdAt: new Date("2026-09-17T12:00:00.000Z"),
  options: [
    { id: "opt-1", label: "Local", position: 0 },
    { id: "opt-2", label: "Visitante", position: 1 },
  ],
};

class FakePlaygroundDao implements PlaygroundDao {
  constructor(private readonly role: PlaygroundRole | null) {}
  async listForUser(): Promise<PlaygroundSummary[]> {
    return [];
  }
  async create(): Promise<Playground> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Playground | null> {
    return playground;
  }
  async findByInviteToken(): Promise<Playground | null> {
    return playground;
  }
  async search(): Promise<Playground[]> {
    return [];
  }
  async findMembership(): Promise<PlaygroundRole | null> {
    return this.role;
  }
  async listMembers(): Promise<PlaygroundMember[]> {
    return [];
  }
  async addMember(): Promise<void> {}
}

class FakeBetDao implements BetDao {
  public locked: { playgroundId?: string; betId?: string } | null = null;

  constructor(private readonly bet: Bet | null) {}

  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return this.bet;
  }
  async listForPlayground(): Promise<BetSummary[]> {
    return [];
  }
  async lockExpired(
    _now: Date,
    filter: { playgroundId?: string; betId?: string },
  ): Promise<void> {
    this.locked = filter;
  }
  async setResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async setStatus(): Promise<void> {}
  async listParticipants() {
    return [];
  }
  async addParticipant(): Promise<void> {}
  async removeParticipant(): Promise<void> {}
  async isSettled(): Promise<boolean> {
    return false;
  }
  async markSettled(): Promise<void> {}
  async saveResidual(): Promise<void> {}
  async proposeResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async listVotes() {
    return [];
  }
  async upsertVote(): Promise<void> {}
  async listLockedAwaitingResult() {
    return [];
  }
  async listPendingResultVotesForUser() {
    return [];
  }
  async listExpiredPendingResults() {
    return [];
  }
}

class FakeProfileDao implements ProfileDao {
  async findById(): Promise<Profile | null> {
    return null;
  }
  async search(): Promise<Profile[]> {
    return [];
  }
  async tryDebit(): Promise<boolean> {
    return false;
  }
  async credit(): Promise<void> {}
  async hasMovement(): Promise<boolean> {
    return false;
  }
  async appendMovement(): Promise<void> {}
}

describe("GetBetUseCase", () => {
  it("returns the bet to a playground member and locks it after the deadline", async () => {
    const dao = new FakeBetDao(openBet);
    const bet = await new GetBetUseCase(
      new FakePlaygroundDao("member"),
      dao,
      new FakeProfileDao(),
    ).call("user-2", "pg-1", "bet-1", new Date("2026-09-18T12:00:01.000Z"));

    expect(dao.locked).toEqual({ playgroundId: "pg-1", betId: "bet-1" });
    expect(bet.status).toBe("locked");
    expect(bet.myOptionId).toBeNull();
    expect(bet.participantCount).toBe(0);
    expect(bet.payout).toBeNull();
    expect(bet.myVote).toBeNull();
  });

  it("hides bets outside the caller's playground", async () => {
    await expect(
      new GetBetUseCase(
        new FakePlaygroundDao("member"),
        new FakeBetDao({ ...openBet, playgroundId: "pg-2" }),
        new FakeProfileDao(),
      ).call("user-2", "pg-1", "bet-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("hides playgrounds the caller does not belong to", async () => {
    await expect(
      new GetBetUseCase(
        new FakePlaygroundDao(null),
        new FakeBetDao(openBet),
        new FakeProfileDao(),
      ).call("user-3", "pg-1", "bet-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
