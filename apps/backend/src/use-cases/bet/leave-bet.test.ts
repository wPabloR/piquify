import { describe, expect, it } from "vitest";
import type { Bet, BetParticipant, BetSummary } from "../../entities/bet.js";
import type { BetStatus } from "@piquify/contracts";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type { AccountMovementKind, Profile } from "../../entities/profile.js";
import { ValidationError } from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import LeaveBetUseCase from "./leave-bet.js";

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
    return "member";
  }
  async listMembers(): Promise<PlaygroundMember[]> {
    return [];
  }
  async addMember(): Promise<void> {}
}

class FakeBetDao implements BetDao {
  public status: BetStatus = "open";
  constructor(public participants: BetParticipant[]) {}
  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return { ...openBet, status: this.status };
  }
  async listForPlayground(): Promise<BetSummary[]> {
    return [];
  }
  async lockExpired(): Promise<void> {}
  async setResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async setStatus(_betId: string, status: BetStatus) {
    this.status = status;
  }
  async listParticipants() {
    return this.participants;
  }
  async addParticipant(): Promise<void> {}
  async removeParticipant(_betId: string, userId: string) {
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
  public movements: AccountMovementKind[] = [];
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
    this.balance -= amount;
    return true;
  }
  async credit(_userId: string, amount: number) {
    this.balance += amount;
  }
  async hasMovement(): Promise<boolean> {
    return false;
  }
  async appendMovement(input: { kind: AccountMovementKind }) {
    this.movements.push(input.kind);
  }
}

describe("LeaveBetUseCase", () => {
  it("refunds the stake and cancels the pique if nobody remains", async () => {
    const bets = new FakeBetDao([{ userId: "user-2", optionId: "opt-1" }]);
    const profiles = new FakeProfileDao(190);
    const detail = await new LeaveBetUseCase(
      new FakePlaygroundDao(),
      bets,
      profiles,
    ).call({
      actorId: "user-2",
      playgroundId: "pg-1",
      betId: "bet-1",
      now,
    });

    expect(profiles.balance).toBe(200);
    expect(profiles.movements).toEqual(["pique_leave"]);
    expect(bets.participants).toEqual([]);
    expect(bets.status).toBe("cancelled");
    expect(detail.myOptionId).toBeNull();
  });

  it("keeps the pique open when other participants remain", async () => {
    const bets = new FakeBetDao([
      { userId: "user-2", optionId: "opt-1" },
      { userId: "user-3", optionId: "opt-2" },
    ]);
    const profiles = new FakeProfileDao(190);
    await new LeaveBetUseCase(new FakePlaygroundDao(), bets, profiles).call({
      actorId: "user-2",
      playgroundId: "pg-1",
      betId: "bet-1",
      now,
    });

    expect(bets.participants).toEqual([{ userId: "user-3", optionId: "opt-2" }]);
    expect(bets.status).toBe("open");
    expect(profiles.balance).toBe(200);
  });

  it("rejects leaving a pique the caller is not in", async () => {
    await expect(
      new LeaveBetUseCase(
        new FakePlaygroundDao(),
        new FakeBetDao([]),
        new FakeProfileDao(200),
      ).call({
        actorId: "user-2",
        playgroundId: "pg-1",
        betId: "bet-1",
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
