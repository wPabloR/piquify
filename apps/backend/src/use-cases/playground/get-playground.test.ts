import { describe, expect, it } from "vitest";
import type { JoinRequest, JoinRequestStatus } from "../../entities/join-request.js";
import type {
  Playground,
  PlaygroundJoinRequest,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type { Bet, BetSummary } from "../../entities/bet.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import GetPlaygroundUseCase from "./get-playground.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  publicCode: 1000,
  createdBy: "user-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
};

class FakePlaygroundDao implements PlaygroundDao {
  constructor(
    private readonly found: Playground | null,
    private readonly role: PlaygroundRole | null,
    private readonly members: PlaygroundMember[] = [],
  ) {}

  async listForUser(_userId: string): Promise<PlaygroundSummary[]> {
    return [];
  }

  async create(_input: { name: string; createdBy: string }): Promise<Playground> {
    throw new Error("not implemented");
  }

  async findById(_id: string): Promise<Playground | null> {
    return this.found;
  }

  async findByInviteToken(_token: string): Promise<Playground | null> {
    return this.found;
  }

  async search(_query: string): Promise<Playground[]> {
    return [];
  }

  async findMembership(
    _playgroundId: string,
    _userId: string,
  ): Promise<PlaygroundRole | null> {
    return this.role;
  }

  async listMembers(_playgroundId: string): Promise<PlaygroundMember[]> {
    return this.members;
  }

  async addMember(
    _playgroundId: string,
    _userId: string,
    _role: PlaygroundRole,
  ): Promise<void> {}
}

class FakeJoinRequestDao implements JoinRequestDao {
  constructor(private readonly pending: PlaygroundJoinRequest[] = []) {}

  async findById(): Promise<JoinRequest | null> {
    return null;
  }
  async findForPlaygroundUser(): Promise<JoinRequest | null> {
    return null;
  }
  async listPendingPlaygroundIds(): Promise<string[]> {
    return [];
  }
  async listPendingForPlayground(): Promise<PlaygroundJoinRequest[]> {
    return this.pending;
  }
  async listPendingForPlaygrounds(): Promise<never[]> {
    return [];
  }
  async create(): Promise<JoinRequest> {
    throw new Error("not implemented");
  }
  async updateStatus(_id: string, _status: JoinRequestStatus): Promise<void> {}
}

class FakeBetDao implements BetDao {
  constructor(private readonly bets: BetSummary[] = []) {}

  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return null;
  }
  async listForPlayground(): Promise<BetSummary[]> {
    return this.bets;
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

describe("GetPlaygroundUseCase", () => {
  it("returns the playground with members and the caller role", async () => {
    const members: PlaygroundMember[] = [
      {
        userId: "user-1",
        displayName: "Ada",
        role: "admin",
        joinedAt: new Date("2026-09-17T10:00:00.000Z"),
      },
    ];
    const useCase = new GetPlaygroundUseCase(
      new FakePlaygroundDao(playground, "admin", members),
      new FakeJoinRequestDao(),
      new FakeBetDao(),
    );

    await expect(useCase.call("user-1", "pg-1")).resolves.toEqual({
      ...playground,
      role: "admin",
      members,
      joinRequests: [],
      bets: [],
    });
  });

  it("hides playgrounds the caller does not belong to", async () => {
    const useCase = new GetPlaygroundUseCase(
      new FakePlaygroundDao(playground, null),
      new FakeJoinRequestDao(),
      new FakeBetDao(),
    );
    await expect(useCase.call("user-2", "pg-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
