import type { ProfileSearchHit } from "../../entities/profile.js";
import { ForbiddenError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

export default class SearchProfilesUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly profileDao: ProfileDao,
    private readonly invitationDao: InvitationDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    query: string;
  }): Promise<ProfileSearchHit[]> {
    const query = input.query.trim();
    if (query.replace(/^#/, "").length < 3) {
      return [];
    }

    const role = await this.playgroundDao.findMembership(
      input.playgroundId,
      input.actorId,
    );
    if (role !== "admin") {
      throw new ForbiddenError();
    }

    const [profiles, members, pendingIds] = await Promise.all([
      this.profileDao.search({
        query,
        excludeUserId: input.actorId,
      }),
      this.playgroundDao.listMembers(input.playgroundId),
      this.invitationDao.listPendingUserIds(input.playgroundId),
    ]);

    const memberIds = new Set(members.map((member) => member.userId));
    const pending = new Set(pendingIds);

    return profiles.map((profile) => ({
      id: profile.id,
      displayName: profile.displayName,
      publicCode: profile.publicCode,
      alreadyMember: memberIds.has(profile.id),
      invitePending: pending.has(profile.id),
    }));
  }
}
