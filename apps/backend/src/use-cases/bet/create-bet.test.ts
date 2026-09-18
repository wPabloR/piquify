import { describe, expect, it } from "vitest";
import type { Bet, BetSummary } from "../../entities/bet.js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import CreateBetUseCase from "./create-bet.js";

const now = new Date("2026-09-18T12:00:00.000Z");
const future = new Date("2026-09-20T18:00:00.000Z");

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  publicCode: 1000,
  createdBy: "admin-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
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
  public created: {
    playgroundId: string;
    createdBy: string;
    title: string;
    stake: number;
    deadline: Date;
    options: string[];
  } | null = null;

  async create(input: {
    playgroundId: string;
    createdBy: string;
    title: string;
    stake: number;
    deadline: Date;
    options: string[];
  }): Promise<Bet> {
    this.created = input;
    return {
      id: "bet-1",
      playgroundId: input.playgroundId,
      title: input.title,
      stake: input.stake,
      deadline: input.deadline,
      status: "open",
      winningOptionId: null,
      voteClosesAt: null,
      createdBy: input.createdBy,
      createdAt: now,
      options: input.options.map((label, position) => ({
        id: `opt-${position}`,
        label,
        position,
      })),
    };
  }

  async findById(): Promise<Bet | null> {
    return null;
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

describe("CreateBetUseCase", () => {
  it("creates an open bet for the playground admin", async () => {
    const dao = new FakeBetDao();
    const created = await new CreateBetUseCase(
      new FakePlaygroundDao("admin"),
      dao,
    ).call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      title: "  El clásico  ",
      stake: 10,
      deadline: future,
      options: [" Local ", "Empate", "Visitante"],
      now,
    });

    expect(dao.created).toEqual({
      playgroundId: "pg-1",
      createdBy: "admin-1",
      title: "El clásico",
      stake: 10,
      deadline: future,
      options: ["Local", "Empate", "Visitante"],
    });
    expect(created.status).toBe("open");
  });

  it("rejects a member who is not admin", async () => {
    await expect(
      new CreateBetUseCase(new FakePlaygroundDao("member"), new FakeBetDao()).call(
        {
          actorId: "user-2",
          playgroundId: "pg-1",
          title: "El clásico",
          stake: 10,
          deadline: future,
          options: ["Local", "Visitante"],
          now,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("hides playgrounds the caller does not belong to", async () => {
    await expect(
      new CreateBetUseCase(new FakePlaygroundDao(null), new FakeBetDao()).call({
        actorId: "user-3",
        playgroundId: "pg-1",
        title: "El clásico",
        stake: 10,
        deadline: future,
        options: ["Local", "Visitante"],
        now,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a past deadline", async () => {
    await expect(
      new CreateBetUseCase(new FakePlaygroundDao("admin"), new FakeBetDao()).call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        title: "El clásico",
        stake: 10,
        deadline: new Date("2026-09-18T11:00:00.000Z"),
        options: ["Local", "Visitante"],
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a single option", async () => {
    await expect(
      new CreateBetUseCase(new FakePlaygroundDao("admin"), new FakeBetDao()).call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        title: "El clásico",
        stake: 10,
        deadline: future,
        options: ["Local"],
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a non-integer stake", async () => {
    await expect(
      new CreateBetUseCase(new FakePlaygroundDao("admin"), new FakeBetDao()).call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        title: "El clásico",
        stake: 1.5,
        deadline: future,
        options: ["Local", "Visitante"],
        now,
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
