import { describe, expect, it } from "vitest";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import GetPlaygroundUseCase from "./get-playground.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  createdBy: "user-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
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

  async findMembership(
    _playgroundId: string,
    _userId: string,
  ): Promise<PlaygroundRole | null> {
    return this.role;
  }

  async listMembers(_playgroundId: string): Promise<PlaygroundMember[]> {
    return this.members;
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
    );

    await expect(useCase.call("user-1", "pg-1")).resolves.toEqual({
      ...playground,
      role: "admin",
      members,
    });
  });

  it("hides playgrounds the caller does not belong to", async () => {
    const useCase = new GetPlaygroundUseCase(
      new FakePlaygroundDao(playground, null),
    );
    await expect(useCase.call("user-2", "pg-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
