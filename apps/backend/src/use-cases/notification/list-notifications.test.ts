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
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";
import type { Profile } from "../../entities/profile.js";
import type { Bet, ResultDueNotification, ResultVoteNotification } from "../../entities/bet.js";
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

class FakeBetDao implements BetDao {
  constructor(
    private readonly resultDue: ResultDueNotification[] = [],
    private readonly resultVotes: ResultVoteNotification[] = [],
  ) {}

  async create(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async findById(): Promise<Bet | null> {
    return null;
  }
  async listForPlayground() {
    return [];
  }
  async lockExpired(): Promise<void> {}
  async proposeResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async setResult(): Promise<Bet> {
    throw new Error("not implemented");
  }
  async setStatus(): Promise<void> {}
  async listParticipants() {
    return [];
  }
  async addParticipant(): Promise<void> {}
  async removeParticipant(): Promise<void> {}
  async listVotes() {
    return [];
  }
  async upsertVote(): Promise<void> {}
  async listLockedAwaitingResult(playgroundIds: string[]) {
    return playgroundIds.length > 0 ? this.resultDue : [];
  }
  async listPendingResultVotesForUser() {
    return this.resultVotes;
  }
  async listExpiredPendingResults() {
    return [];
  }
  async isSettled(): Promise<boolean> {
    return false;
  }
  async markSettled(): Promise<void> {}
  async saveResidual(): Promise<void> {}
}

class FakeProfileDao implements ProfileDao {
  async findById(): Promise<Profile | null> {
    return null;
  }
  async search(): Promise<Profile[]> {
    return [];
  }
  async tryDebit(): Promise<boolean> {
    return false;
  }
  async credit(): Promise<void> {}
  async hasMovement(): Promise<boolean> {
    return false;
  }
  async appendMovement(): Promise<void> {}
}

const resultDue: ResultDueNotification = {
  betId: "bet-1",
  playgroundId: "pg-1",
  playgroundName: "La peña",
  title: "El clásico",
  deadline: new Date("2026-09-18T12:00:00.000Z"),
};

const resultVote: ResultVoteNotification = {
  betId: "bet-2",
  playgroundId: "pg-1",
  playgroundName: "La peña",
  title: "El derbi",
  voteClosesAt: new Date("2026-09-20T12:00:00.000Z"),
  proposedOptionLabel: "Local",
};

describe("ListNotificationsUseCase", () => {
  it("returns invitations and join requests for playgrounds you admin", async () => {
    const joinRequests = new FakeJoinRequestDao();
    const useCase = new ListNotificationsUseCase(
      new FakePlaygroundDao("admin"),
      new FakeInvitationDao(),
      joinRequests,
      new FakeBetDao([resultDue]),
      new FakeProfileDao(),
    );

    await expect(useCase.call("admin-1")).resolves.toEqual({
      invitations: [invitation],
      joinRequests: [joinRequest],
      resultDue: [resultDue],
      resultVotes: [],
    });
    expect(joinRequests.queriedIds).toEqual(["pg-1"]);
  });

  it("does not load join requests when you are only a member", async () => {
    const joinRequests = new FakeJoinRequestDao();
    const useCase = new ListNotificationsUseCase(
      new FakePlaygroundDao("member"),
      new FakeInvitationDao(),
      joinRequests,
      new FakeBetDao(),
      new FakeProfileDao(),
    );

    await expect(useCase.call("user-2")).resolves.toEqual({
      invitations: [invitation],
      joinRequests: [],
      resultDue: [],
      resultVotes: [],
    });
    expect(joinRequests.queriedIds).toEqual([]);
  });

  it("notifies participants when they still have to validate a result", async () => {
    const useCase = new ListNotificationsUseCase(
      new FakePlaygroundDao("member"),
      new FakeInvitationDao(),
      new FakeJoinRequestDao(),
      new FakeBetDao([], [resultVote]),
      new FakeProfileDao(),
    );

    await expect(useCase.call("user-2")).resolves.toEqual({
      invitations: [invitation],
      joinRequests: [],
      resultDue: [],
      resultVotes: [resultVote],
    });
  });
});
