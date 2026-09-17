import type { Profile } from "../../entities/profile.js";
import { NotFoundError } from "../../errors/http-error.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

export default class GetUserProfileUseCase {
  constructor(private readonly profileDao: ProfileDao) {}

  async getProfileForUserId(userId: string): Promise<Profile> {
    const profile = await this.profileDao.findById(userId);
    if (!profile) {
      throw new NotFoundError("Profile not found");
    }
    return profile;
  }
}
