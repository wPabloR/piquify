import { ForbiddenError, ValidationError } from "../../errors/http-error.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

export default class InviteToPlaygroundUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly profileDao: ProfileDao,
    private readonly invitationDao: InvitationDao,
  ) {}

  async call(input: {
    actorId: string;
    playgroundId: string;
    invitedUserId: string;
  }): Promise<void> {
    if (input.actorId === input.invitedUserId) {
      throw new ValidationError("No puedes invitarte a ti mismo");
    }

    const role = await this.playgroundDao.findMembership(
      input.playgroundId,
      input.actorId,
    );
    if (role !== "admin") {
      throw new ForbiddenError();
    }

    const profile = await this.profileDao.findById(input.invitedUserId);
    if (!profile) {
      throw new ValidationError("Ese usuario no existe");
    }

    const membership = await this.playgroundDao.findMembership(
      input.playgroundId,
      input.invitedUserId,
    );
    if (membership) {
      throw new ValidationError("Ya es miembro de este playground");
    }

    const existing = await this.invitationDao.findForPlaygroundUser(
      input.playgroundId,
      input.invitedUserId,
    );

    if (!existing) {
      await this.invitationDao.create({
        playgroundId: input.playgroundId,
        invitedUserId: input.invitedUserId,
        invitedBy: input.actorId,
      });
      return;
    }

    if (existing.status === "pending") {
      return;
    }

    await this.invitationDao.updateStatus(existing.id, "pending", input.actorId);
  }
}
