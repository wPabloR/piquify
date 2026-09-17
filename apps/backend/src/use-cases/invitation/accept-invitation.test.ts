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
import { ForbiddenError, NotFoundError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import AcceptInvitationUseCase from "./accept-invitation.js";

const invitation: Invitation = {
  id: "inv-1",
  playgroundId: "pg-1",
  invitedUserId: "user-2",
  invitedBy: "admin-1",
  status: "pending",
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
};

class FakeInvitationDao implements InvitationDao {
  public status: InvitationStatus | null = null;

  constructor(private readonly found: Invitation | null) {}

  async findById(): Promise<Invitation | null> {
    return this.found;
  }
  async findForPlaygroundUser(): Promise<Invitation | null> {
    return this.found;
  }
  async listPendingUserIds(): Promise<string[]> {
    return [];
  }
  async listPendingForUser(): Promise<ReceivedInvitation[]> {
    return [];
  }
  async create(): Promise<Invitation> {
    throw new Error("not implemented");
  }
  async updateStatus(_id: string, status: InvitationStatus): Promise<void> {
    this.status = status;
  }
}

class FakePlaygroundDao implements PlaygroundDao {
  public addedUserId: string | null = null;

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

describe("AcceptInvitationUseCase", () => {
  it("adds the invitee as member and marks the invite accepted", async () => {
    const invitations = new FakeInvitationDao(invitation);
    const playgrounds = new FakePlaygroundDao();
    const useCase = new AcceptInvitationUseCase(invitations, playgrounds);

    await expect(useCase.call("user-2", "inv-1")).resolves.toEqual({
      playgroundId: "pg-1",
    });
    expect(playgrounds.addedUserId).toBe("user-2");
    expect(invitations.status).toBe("accepted");
  });

  it("forbids another user from accepting", async () => {
    const useCase = new AcceptInvitationUseCase(
      new FakeInvitationDao(invitation),
      new FakePlaygroundDao(),
    );
    await expect(useCase.call("user-3", "inv-1")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("rejects missing invites", async () => {
    const useCase = new AcceptInvitationUseCase(
      new FakeInvitationDao(null),
      new FakePlaygroundDao(),
    );
    await expect(useCase.call("user-2", "inv-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
