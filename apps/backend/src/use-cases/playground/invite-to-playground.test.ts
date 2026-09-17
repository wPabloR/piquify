import { describe, expect, it } from "vitest";
import type {
  Invitation,
  InvitationStatus,
  ReceivedInvitation,
} from "../../entities/invitation.js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type { Profile } from "../../entities/profile.js";
import { ForbiddenError, ValidationError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import InviteToPlaygroundUseCase from "./invite-to-playground.js";

const playground: Playground = {
  id: "pg-1",
  name: "La peña",
  createdBy: "admin-1",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
  inviteToken: "invite-1",
};

const invitee: Profile = {
  id: "user-2",
  displayName: "Ada",
  publicCode: 4585,
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
};

class FakePlaygroundDao implements PlaygroundDao {
  constructor(private readonly actorRole: PlaygroundRole | null) {}

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
  async addMember(): Promise<void> {}
}

class FakeProfileDao implements ProfileDao {
  async findById(id: string): Promise<Profile | null> {
    return id === invitee.id ? invitee : null;
  }
  async search(): Promise<Profile[]> {
    return [];
  }
}

class FakeInvitationDao implements InvitationDao {
  public created: Invitation | null = null;

  async findById(): Promise<Invitation | null> {
    return null;
  }
  async findForPlaygroundUser(): Promise<Invitation | null> {
    return null;
  }
  async listPendingUserIds(): Promise<string[]> {
    return [];
  }
  async listPendingForUser(): Promise<ReceivedInvitation[]> {
    return [];
  }
  async create(input: {
    playgroundId: string;
    invitedUserId: string;
    invitedBy: string;
  }): Promise<Invitation> {
    this.created = {
      id: "inv-1",
      playgroundId: input.playgroundId,
      invitedUserId: input.invitedUserId,
      invitedBy: input.invitedBy,
      status: "pending",
      createdAt: new Date("2026-09-17T10:00:00.000Z"),
    };
    return this.created;
  }
  async updateStatus(
    _id: string,
    _status: InvitationStatus,
    _invitedBy?: string,
  ): Promise<void> {}
}

describe("InviteToPlaygroundUseCase", () => {
  it("creates a pending invitation when the actor is admin", async () => {
    const invitations = new FakeInvitationDao();
    const useCase = new InviteToPlaygroundUseCase(
      new FakePlaygroundDao("admin"),
      new FakeProfileDao(),
      invitations,
    );

    await useCase.call({
      actorId: "admin-1",
      playgroundId: "pg-1",
      invitedUserId: "user-2",
    });

    expect(invitations.created?.invitedUserId).toBe("user-2");
  });

  it("forbids members from inviting", async () => {
    const useCase = new InviteToPlaygroundUseCase(
      new FakePlaygroundDao("member"),
      new FakeProfileDao(),
      new FakeInvitationDao(),
    );

    await expect(
      useCase.call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        invitedUserId: "user-2",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejects inviting yourself", async () => {
    const useCase = new InviteToPlaygroundUseCase(
      new FakePlaygroundDao("admin"),
      new FakeProfileDao(),
      new FakeInvitationDao(),
    );

    await expect(
      useCase.call({
        actorId: "admin-1",
        playgroundId: "pg-1",
        invitedUserId: "admin-1",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
