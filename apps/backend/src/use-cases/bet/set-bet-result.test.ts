import { describe, expect, it } from "vitest";
import type { Bet, BetParticipant, BetResultVote, BetSummary } from "../../entities/bet.js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type { AccountMovementKind, Profile } from "../../entities/profile.js";
import {
  ForbiddenError,
  ValidationError,
} from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import SetBetResultUseCase from "./set-bet-result.js";
import VoteBetResultUseCase from "./vote-bet-result.js";
import GetBetUseCase from "./get-bet.js";

const lockedBet: Bet = {
  id: "bet-1",
  playgroundId: "pg-1",
  title: "El clásico",
  stake: 10,
  deadline: new Date("2026-09-18T12:00:00.000Z"),
  status: "locked",
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
  public proposed: { betId: string; optionId: string } | null = null;
  public result: { betId: string; optionId: string } | null = null;
  public settled = false;
  public residual: { amount: number; memberIds: string[] } | null = null;
  public votes: BetResultVote[] = [];

  constructor(
    private bet: Bet,
    public participants: BetParticipant[] = [],
  ) {}

  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return this.bet;
  }
  async listForPlayground(): Promise<BetSummary[]> {
    return [];
  }
  async lockExpired(): Promise<void> {
    if (this.bet.status === "open") {
      this.bet = { ...this.bet, status: "locked" };
    }
  }
  async proposeResult(betId: string, optionId: string, voteClosesAt: Date) {
    this.proposed = { betId, optionId };
    this.bet = {
      ...this.bet,
      status: "pending_result",
      winningOptionId: optionId,
      voteClosesAt,
    };
    return this.bet;
  }
  async setResult(betId: string, optionId: string): Promise<Bet> {
    this.result = { betId, optionId };
    this.bet = {
      ...this.bet,
      status: "resolved",
      winningOptionId: optionId,
    };
    return this.bet;
  }
  async setStatus(): Promise<void> {}
  async listParticipants() {
    return this.participants;
  }
  async addParticipant(): Promise<void> {}
  async removeParticipant(): Promise<void> {}
  async listVotes() {
    return this.votes;
  }
  async upsertVote(input: BetResultVote & { betId: string }) {
    this.votes = [
      ...this.votes.filter((vote) => vote.userId !== input.userId),
      {
        userId: input.userId,
        choice: input.choice,
        suggestedOptionId: input.suggestedOptionId,
      },
    ];
  }
  async listLockedAwaitingResult() {
    return [];
  }
  async listPendingResultVotesForUser() {
    return [];
  }
  async listExpiredPendingResults(now: Date) {
    if (
      this.bet.status === "pending_result" &&
      this.bet.voteClosesAt &&
      this.bet.voteClosesAt.getTime() <= now.getTime()
    ) {
      return [this.bet];
    }
    return [];
  }
  async isSettled(): Promise<boolean> {
    return this.settled;
  }
  async markSettled(): Promise<void> {
    this.settled = true;
  }
  async saveResidual(input: { amount: number; memberIds: string[] }) {
    this.residual = { amount: input.amount, memberIds: input.memberIds };
  }
}

class FakeProfileDao implements ProfileDao {
  public balances = new Map<string, number>();
  public movements: { userId: string; amount: number; kind: AccountMovementKind }[] =
    [];

  constructor(balances: Record<string, number>) {
    this.balances = new Map(Object.entries(balances));
  }

  async findById(id: string): Promise<Profile | null> {
    const balance = this.balances.get(id);
    if (balance === undefined) {
      return null;
    }
    return {
      id,
      displayName: id,
      publicCode: 1000,
      balance,
      createdAt: lockedBet.createdAt,
    };
  }
  async search(): Promise<Profile[]> {
    return [];
  }
  async tryDebit(userId: string, amount: number) {
    const balance = this.balances.get(userId);
    if (balance === undefined || balance < amount) {
      return false;
    }
    this.balances.set(userId, balance - amount);
    return true;
  }
  async credit(userId: string, amount: number) {
    this.balances.set(userId, (this.balances.get(userId) ?? 0) + amount);
  }
  async hasMovement(input: { userId: string; kind: AccountMovementKind }) {
    return this.movements.some(
      (movement) =>
        movement.userId === input.userId && movement.kind === input.kind,
    );
  }
  async appendMovement(input: {
    userId: string;
    amount: number;
    kind: AccountMovementKind;
  }) {
    this.movements.push({
      userId: input.userId,
      amount: input.amount,
      kind: input.kind,
    });
  }
}

function useCase(
  role: PlaygroundRole,
  bets: FakeBetDao,
  profiles = new FakeProfileDao({}),
) {
  return new SetBetResultUseCase(new FakePlaygroundDao(role), bets, profiles);
}

describe("SetBetResultUseCase", () => {
  it("lets the admin propose a result and settles it when nobody joined", async () => {
    const dao = new FakeBetDao(lockedBet);
    const bet = await useCase("admin", dao).call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      betId: "bet-1",
      optionId: "opt-1",
    });

    expect(dao.proposed).toEqual({ betId: "bet-1", optionId: "opt-1" });
    expect(dao.result).toEqual({ betId: "bet-1", optionId: "opt-1" });
    expect(bet.status).toBe("resolved");
    expect(bet.winningOptionId).toBe("opt-1");
    expect(dao.settled).toBe(true);
  });

  it("keeps the pique pending until participants validate", async () => {
    const bets = new FakeBetDao(lockedBet, [
      { userId: "user-2", optionId: "opt-1" },
      { userId: "user-3", optionId: "opt-2" },
    ]);
    const profiles = new FakeProfileDao({ "user-2": 190, "user-3": 190 });

    const bet = await useCase("admin", bets, profiles).call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      betId: "bet-1",
      optionId: "opt-1",
    });

    expect(bet.status).toBe("pending_result");
    expect(bet.winningOptionId).toBe("opt-1");
    expect(bets.settled).toBe(false);
    expect(profiles.balances.get("user-2")).toBe(190);
    expect(profiles.movements).toEqual([]);
  });

  it("confirms immediately when the admin is the only participant", async () => {
    const bets = new FakeBetDao(lockedBet, [
      { userId: "admin-1", optionId: "opt-1" },
    ]);
    const profiles = new FakeProfileDao({ "admin-1": 190 });

    const bet = await useCase("admin", bets, profiles).call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      betId: "bet-1",
      optionId: "opt-1",
    });

    expect(bet.status).toBe("resolved");
    expect(profiles.balances.get("admin-1")).toBe(200);
    expect(profiles.movements).toEqual([
      { userId: "admin-1", amount: 10, kind: "pique_win" },
    ]);
  });

  it("locks an expired open bet before accepting the result", async () => {
    const dao = new FakeBetDao({ ...lockedBet, status: "open" });
    const bet = await useCase("admin", dao).call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      betId: "bet-1",
      optionId: "opt-2",
    });

    expect(bet.status).toBe("resolved");
    expect(bet.winningOptionId).toBe("opt-2");
  });

  it("rejects a member who is not admin", async () => {
    await expect(
      useCase("member", new FakeBetDao(lockedBet)).call({
        actorId: "user-2",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects a result while the bet is still open", async () => {
    const dao = new FakeBetDao({ ...lockedBet, status: "open" });
    dao.lockExpired = async () => {};
    await expect(
      useCase("admin", dao).call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an option that does not belong to the bet", async () => {
    await expect(
      useCase("admin", new FakeBetDao(lockedBet)).call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        betId: "bet-1",
        optionId: "opt-other",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

const pendingBet: Bet = {
  ...lockedBet,
  status: "pending_result",
  winningOptionId: "opt-1",
  voteClosesAt: new Date("2026-09-20T12:00:00.000Z"),
};

function voteUseCase(
  role: PlaygroundRole,
  bets: FakeBetDao,
  profiles = new FakeProfileDao({}),
) {
  return new VoteBetResultUseCase(new FakePlaygroundDao(role), bets, profiles);
}

describe("VoteBetResultUseCase", () => {
  it("pays the pot when every participant confirms", async () => {
    const bets = new FakeBetDao(pendingBet, [
      { userId: "user-2", optionId: "opt-1" },
      { userId: "user-3", optionId: "opt-2" },
    ]);
    const profiles = new FakeProfileDao({ "user-2": 190, "user-3": 190 });

    await voteUseCase("member", bets, profiles).call({
      actorId: "user-2",
      playgroundId: "pg-1",
      betId: "bet-1",
      choice: "confirm",
      now: new Date("2026-09-19T12:00:00.000Z"),
    });

    expect(bets.settled).toBe(false);

    const bet = await voteUseCase("member", bets, profiles).call({
      actorId: "user-3",
      playgroundId: "pg-1",
      betId: "bet-1",
      choice: "confirm",
      now: new Date("2026-09-19T12:00:00.000Z"),
    });

    expect(bet.status).toBe("resolved");
    expect(profiles.balances.get("user-2")).toBe(210);
    expect(profiles.balances.get("user-3")).toBe(190);
    expect(profiles.movements).toEqual([
      { userId: "user-2", amount: 20, kind: "pique_win" },
    ]);
    expect(bet.payout).toEqual({
      pot: 20,
      winnerCount: 1,
      share: 20,
      residual: 0,
      refund: 0,
    });
  });

  it("uses the option suggested by a majority against", async () => {
    const bets = new FakeBetDao(pendingBet, [
      { userId: "user-2", optionId: "opt-2" },
      { userId: "user-3", optionId: "opt-2" },
      { userId: "user-4", optionId: "opt-1" },
    ]);
    const profiles = new FakeProfileDao({
      "user-2": 190,
      "user-3": 190,
      "user-4": 190,
    });

    await voteUseCase("member", bets, profiles).call({
      actorId: "user-2",
      playgroundId: "pg-1",
      betId: "bet-1",
      choice: "reject",
      suggestedOptionId: "opt-2",
    });
    await voteUseCase("member", bets, profiles).call({
      actorId: "user-3",
      playgroundId: "pg-1",
      betId: "bet-1",
      choice: "reject",
      suggestedOptionId: "opt-2",
    });
    const bet = await voteUseCase("member", bets, profiles).call({
      actorId: "user-4",
      playgroundId: "pg-1",
      betId: "bet-1",
      choice: "confirm",
    });

    expect(bet.status).toBe("resolved");
    expect(bet.winningOptionId).toBe("opt-2");
    expect(profiles.balances.get("user-2")).toBe(205);
    expect(profiles.balances.get("user-3")).toBe(205);
    expect(profiles.balances.get("user-4")).toBe(190);
  });

  it("treats silence as a confirm after 48 hours", async () => {
    const bets = new FakeBetDao(pendingBet, [
      { userId: "user-2", optionId: "opt-1" },
      { userId: "user-3", optionId: "opt-2" },
    ]);
    bets.votes = [
      { userId: "user-2", choice: "confirm", suggestedOptionId: null },
    ];
    const profiles = new FakeProfileDao({ "user-2": 190, "user-3": 190 });

    const bet = await new GetBetUseCase(
      new FakePlaygroundDao("member"),
      bets,
      profiles,
    ).call("user-3", "pg-1", "bet-1", new Date("2026-09-20T12:00:00.000Z"));

    expect(bet.status).toBe("resolved");
    expect(profiles.balances.get("user-2")).toBe(210);
    expect(bets.settled).toBe(true);
  });

  it("rejects a vote from someone who did not join", async () => {
    await expect(
      voteUseCase("member", new FakeBetDao(pendingBet)).call({
        actorId: "user-2",
        playgroundId: "pg-1",
        betId: "bet-1",
        choice: "confirm",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
