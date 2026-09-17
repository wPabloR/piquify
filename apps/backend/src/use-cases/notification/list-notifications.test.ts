import { describe, expect, it } from "vitest";
import type {
  Invitation,
  InvitationStatus,
  ReceivedInvitation,
} from "../../entities/invitation.js";
import type { AdminJoinRequest, JoinRequest, JoinRequestStatus } from "../../entities/join-request.js";
import type {
  Playground,
  PlaygroundJoinRequest,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import ListNotificationsUseCase from "./list-notifications.js";

const invitation: ReceivedInvitation = {
  id: "inv-1",
  playgroundId: "pg-2",
  playgroundName: "Otro",
  invitedByName: "Ada",
  invitedByPublicCode: 1001,
  createdAt: new Date("2026-09-17T10:00:00.000Z"),
};

const joinRequest: AdminJoinRequest = {
  id: "req-1",
  playgroundId: "pg-1",
  playgroundName: "La peña",
  userId: "user-2",
  displayName: "Bob",
  publicCode: 1002,
  createdAt: new Date("2026-09-17T11:00:00.000Z"),
};

class FakePlaygroundDao implements PlaygroundDao {
  constructor(private readonly role: PlaygroundRole) {}

  async listForUser(): Promise<PlaygroundSummary[]> {
    return [
      {
        id: "pg-1",
        name: "La peña",
        publicCode: 1000,
        createdBy: "admin-1",
        createdAt: new Date("2026-09-17T10:00:00.000Z"),
        role: this.role,
      },
    ];
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

class FakeInvitationDao implements InvitationDao {
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
    return [invitation];
  }
  async create(): Promise<Invitation> {
    throw new Error("not implemented");
  }
  async updateStatus(_id: string, _status: InvitationStatus): Promise<void> {}
}

class FakeJoinRequestDao implements JoinRequestDao {
  public queriedIds: string[] = [];

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
  async listPendingForPlaygrounds(
    playgroundIds: string[],
  ): Promise<AdminJoinRequest[]> {
    this.queriedIds = playgroundIds;
    return playgroundIds.includes("pg-1") ? [joinRequest] : [];
  }
  async create(): Promise<JoinRequest> {
    throw new Error("not implemented");
  }
  async updateStatus(_id: string, _status: JoinRequestStatus): Promise<void> {}
}

describe("ListNotificationsUseCase", () => {
  it("returns invitations and join requests for playgrounds you admin", async () => {
    const joinRequests = new FakeJoinRequestDao();
    const useCase = new ListNotificationsUseCase(
      new FakePlaygroundDao("admin"),
      new FakeInvitationDao(),
      joinRequests,
    );

    await expect(useCase.call("admin-1")).resolves.toEqual({
      invitations: [invitation],
      joinRequests: [joinRequest],
    });
    expect(joinRequests.queriedIds).toEqual(["pg-1"]);
  });

  it("does not load join requests when you are only a member", async () => {
    const joinRequests = new FakeJoinRequestDao();
    const useCase = new ListNotificationsUseCase(
      new FakePlaygroundDao("member"),
      new FakeInvitationDao(),
      joinRequests,
    );

    await expect(useCase.call("user-2")).resolves.toEqual({
      invitations: [invitation],
      joinRequests: [],
    });
    expect(joinRequests.queriedIds).toEqual([]);
  });
});
