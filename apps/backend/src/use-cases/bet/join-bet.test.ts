import { describe, expect, it } from "vitest";
import type { Bet, BetParticipant, BetSummary } from "../../entities/bet.js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type { AccountMovementKind, Profile } from "../../entities/profile.js";
import { NotFoundError, ValidationError } from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import JoinBetUseCase from "./join-bet.js";

const now = new Date("2026-09-18T12:00:00.000Z");

const openBet: Bet = {
  id: "bet-1",
  playgroundId: "pg-1",
  title: "El clásico",
  stake: 10,
  deadline: new Date("2026-09-25T18:00:00.000Z"),
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
    return null;
  }
  async findByInviteToken(): Promise<Playground | null> {
    return null;
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
  public participants: BetParticipant[] = [];
  constructor(private readonly bet: Bet) {}
  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return this.bet;
  }
  async listForPlayground(): Promise<BetSummary[]> {
    return [];
  }
  async lockExpired(): Promise<void> {}
  async setResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async setStatus(): Promise<void> {}
  async listParticipants() {
    return this.participants;
  }
  async addParticipant(input: {
    betId: string;
    userId: string;
    optionId: string;
  }) {
    this.participants.push({ userId: input.userId, optionId: input.optionId });
  }
  async removeParticipant(betId: string, userId: string) {
    this.participants = this.participants.filter(
      (participant) => participant.userId !== userId,
    );
  }
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
  public movements: { amount: number; kind: AccountMovementKind }[] = [];
  constructor(public balance: number) {}
  async findById(id: string): Promise<Profile | null> {
    return {
      id,
      displayName: "Ada",
      publicCode: 1000,
      balance: this.balance,
      createdAt: now,
    };
  }
  async search(): Promise<Profile[]> {
    return [];
  }
  async tryDebit(_userId: string, amount: number) {
    if (this.balance < amount) {
      return false;
    }
    this.balance -= amount;
    return true;
  }
  async credit(_userId: string, amount: number) {
    this.balance += amount;
  }
  async hasMovement(): Promise<boolean> {
    return false;
  }
  async appendMovement(input: { amount: number; kind: AccountMovementKind }) {
    this.movements.push({ amount: input.amount, kind: input.kind });
  }
}

describe("JoinBetUseCase", () => {
  it("lets a member join an open pique when they have enough points", async () => {
    const bets = new FakeBetDao(openBet);
    const profiles = new FakeProfileDao(200);
    const detail = await new JoinBetUseCase(
      new FakePlaygroundDao("member"),
      bets,
      profiles,
    ).call({
      actorId: "user-2",
      playgroundId: "pg-1",
      betId: "bet-1",
      optionId: "opt-1",
      now,
    });

    expect(bets.participants).toEqual([{ userId: "user-2", optionId: "opt-1" }]);
    expect(profiles.balance).toBe(190);
    expect(profiles.movements).toEqual([{ amount: -10, kind: "pique_join" }]);
    expect(detail.myOptionId).toBe("opt-1");
    expect(detail.participantCount).toBe(1);
  });

  it("rejects joining without enough points", async () => {
    await expect(
      new JoinBetUseCase(
        new FakePlaygroundDao("member"),
        new FakeBetDao(openBet),
        new FakeProfileDao(5),
      ).call({
        actorId: "user-2",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-1",
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a second join by the same member", async () => {
    const bets = new FakeBetDao(openBet);
    bets.participants = [{ userId: "user-2", optionId: "opt-1" }];
    await expect(
      new JoinBetUseCase(
        new FakePlaygroundDao("member"),
        bets,
        new FakeProfileDao(200),
      ).call({
        actorId: "user-2",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-2",
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("hides playgrounds the caller does not belong to", async () => {
    await expect(
      new JoinBetUseCase(
        new FakePlaygroundDao(null),
        new FakeBetDao(openBet),
        new FakeProfileDao(200),
      ).call({
        actorId: "user-3",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-1",
        now,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
