import { describe, expect, it } from "vitest";
import type { JoinRequest, JoinRequestStatus } from "../../entities/join-request.js";
import type {
  Playground,
  PlaygroundJoinRequest,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { ForbiddenError, NotFoundError } from "../../errors/http-error.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import AcceptJoinRequestUseCase from "./accept-join-request.js";

const request: JoinRequest = {
  id: "req-1",
  playgroundId: "pg-1",
  userId: "user-2",
  status: "pending",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
};

class FakeJoinRequestDao implements JoinRequestDao {
  public status: JoinRequestStatus | null = null;

  constructor(private readonly found: JoinRequest | null) {}

  async findById(): Promise<JoinRequest | null> {
    return this.found;
  }
  async findForPlaygroundUser(): Promise<JoinRequest | null> {
    return this.found;
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
  async create(): Promise<JoinRequest> {
    throw new Error("not implemented");
  }
  async updateStatus(_id: string, status: JoinRequestStatus): Promise<void> {
    this.status = status;
  }
}

class FakePlaygroundDao implements PlaygroundDao {
  public addedUserId: string | null = null;

  constructor(private readonly actorRole: PlaygroundRole | null) {}

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
  async findMembership(
    _playgroundId: string,
    userId: string,
  ): Promise<PlaygroundRole | null> {
    if (userId === "admin-1") {
      return this.actorRole;
    }
    return null;
  }
  async listMembers(): Promise<PlaygroundMember[]> {
    return [];
  }
  async addMember(
    _playgroundId: string,
    userId: string,
    _role: PlaygroundRole,
  ): Promise<void> {
    this.addedUserId = userId;
  }
}

describe("AcceptJoinRequestUseCase", () => {
  it("adds the requester as member when the actor is admin", async () => {
    const requests = new FakeJoinRequestDao(request);
    const playgrounds = new FakePlaygroundDao("admin");
    const useCase = new AcceptJoinRequestUseCase(playgrounds, requests);

    await useCase.call("admin-1", "req-1");
    expect(playgrounds.addedUserId).toBe("user-2");
    expect(requests.status).toBe("accepted");
  });

  it("forbids members from accepting", async () => {
    const useCase = new AcceptJoinRequestUseCase(
      new FakePlaygroundDao("member"),
      new FakeJoinRequestDao(request),
    );
    await expect(useCase.call("admin-1", "req-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("rejects missing requests", async () => {
    const useCase = new AcceptJoinRequestUseCase(
      new FakePlaygroundDao("admin"),
      new FakeJoinRequestDao(null),
    );
    await expect(useCase.call("admin-1", "req-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
