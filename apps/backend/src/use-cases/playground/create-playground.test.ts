import { describe, expect, it } from "vitest";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import { ValidationError } from "../../errors/http-error.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import CreatePlaygroundUseCase from "./create-playground.js";

class FakePlaygroundDao implements PlaygroundDao {
  public created: { name: string; createdBy: string } | null = null;

  async listForUser(_userId: string): Promise<PlaygroundSummary[]> {
    return [];
  }

  async create(input: { name: string; createdBy: string }): Promise<Playground> {
    this.created = input;
    return {
      id: "pg-1",
      name: input.name,
      createdBy: input.createdBy,
      createdAt: new Date("2026-09-17T10:00:00.000Z"),
      inviteToken: "invite-1",
    };
  }

  async findById(_id: string): Promise<Playground | null> {
    return null;
  }

  async findByInviteToken(_token: string): Promise<Playground | null> {
    return null;
  }

  async findMembership(
    _playgroundId: string,
    _userId: string,
  ): Promise<PlaygroundRole | null> {
    return null;
  }

  async listMembers(_playgroundId: string): Promise<PlaygroundMember[]> {
    return [];
  }

  async addMember(
    _playgroundId: string,
    _userId: string,
    _role: PlaygroundRole,
  ): Promise<void> {}
}

describe("CreatePlaygroundUseCase", () => {
  it("creates a playground with a trimmed name", async () => {
    const dao = new FakePlaygroundDao();
    const useCase = new CreatePlaygroundUseCase(dao);
    const playground = await useCase.call("user-1", "  La peña  ");

    expect(dao.created).toEqual({ name: "La peña", createdBy: "user-1" });
    expect(playground.name).toBe("La peña");
  });

  it("rejects an empty name", async () => {
    const useCase = new CreatePlaygroundUseCase(new FakePlaygroundDao());
    await expect(useCase.call("user-1", "   ")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a name longer than 80 characters", async () => {
    const useCase = new CreatePlaygroundUseCase(new FakePlaygroundDao());
    await expect(useCase.call("user-1", "x".repeat(81))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
