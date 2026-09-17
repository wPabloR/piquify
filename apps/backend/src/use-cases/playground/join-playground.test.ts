import { describe, expect, it } from "vitest";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import JoinPlaygroundUseCase from "./join-playground.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  createdBy: "user-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
};

class FakePlaygroundDao implements PlaygroundDao {
  public added: { playgroundId: string; userId: string; role: PlaygroundRole } | null =
    null;

  constructor(
    private readonly found: Playground | null,
    private readonly role: PlaygroundRole | null,
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

  async findMembership(
    _playgroundId: string,
    _userId: string,
  ): Promise<PlaygroundRole | null> {
    return this.role;
  }

  async listMembers(_playgroundId: string): Promise<PlaygroundMember[]> {
    return [];
  }

  async addMember(
    playgroundId: string,
    userId: string,
    role: PlaygroundRole,
  ): Promise<void> {
    this.added = { playgroundId, userId, role };
  }
}

describe("JoinPlaygroundUseCase", () => {
  it("adds the caller as a member", async () => {
    const dao = new FakePlaygroundDao(playground, null);
    const useCase = new JoinPlaygroundUseCase(dao);

    await expect(useCase.call("user-2", "invite-1")).resolves.toEqual({
      playgroundId: "pg-1",
    });
    expect(dao.added).toEqual({
      playgroundId: "pg-1",
      userId: "user-2",
      role: "member",
    });
  });

  it("does not add a member twice", async () => {
    const dao = new FakePlaygroundDao(playground, "member");
    const useCase = new JoinPlaygroundUseCase(dao);

    await expect(useCase.call("user-2", "invite-1")).resolves.toEqual({
      playgroundId: "pg-1",
    });
    expect(dao.added).toBeNull();
  });

  it("rejects an unknown invite", async () => {
    const useCase = new JoinPlaygroundUseCase(new FakePlaygroundDao(null, null));
    await expect(useCase.call("user-2", "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
