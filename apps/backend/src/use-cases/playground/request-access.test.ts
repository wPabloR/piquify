import { describe, expect, it } from "vitest";
import type { JoinRequest, JoinRequestStatus } from "../../entities/join-request.js";
import type {
  Playground,
  PlaygroundJoinRequest,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { NotFoundError, ValidationError } from "../../errors/http-error.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import RequestAccessUseCase from "./request-access.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  publicCode: 1000,
  createdBy: "admin-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
};

class FakePlaygroundDao implements PlaygroundDao {
  constructor(private readonly memberRole: PlaygroundRole | null) {}

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
    return this.memberRole;
  }
  async listMembers(): Promise<PlaygroundMember[]> {
    return [];
  }
  async addMember(): Promise<void> {}
}

class FakeJoinRequestDao implements JoinRequestDao {
  public created: JoinRequest | null = null;

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
    return [];
  }
  async listPendingForPlaygrounds(): Promise<never[]> {
    return [];
  }
  async create(input: {
    playgroundId: string;
    userId: string;
  }): Promise<JoinRequest> {
    this.created = {
      id: "req-1",
      playgroundId: input.playgroundId,
      userId: input.userId,
      status: "pending",
      createdAt: new Date("2026-09-17T10:00:00.000Z"),
    };
    return this.created;
  }
  async updateStatus(_id: string, _status: JoinRequestStatus): Promise<void> {}
}

describe("RequestAccessUseCase", () => {
  it("creates a pending join request", async () => {
    const requests = new FakeJoinRequestDao();
    const useCase = new RequestAccessUseCase(
      new FakePlaygroundDao(null),
      requests,
    );

    await useCase.call("user-2", "pg-1");
    expect(requests.created?.userId).toBe("user-2");
  });

  it("rejects members", async () => {
    const useCase = new RequestAccessUseCase(
      new FakePlaygroundDao("member"),
      new FakeJoinRequestDao(),
    );

    await expect(useCase.call("user-2", "pg-1")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a missing playground", async () => {
    const playgrounds = new FakePlaygroundDao(null);
    playgrounds.findById = async () => null;
    const useCase = new RequestAccessUseCase(
      playgrounds,
      new FakeJoinRequestDao(),
    );

    await expect(useCase.call("user-2", "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
