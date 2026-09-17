import type { Profile } from "../../entities/profile.js";

export default interface ProfileDao {
  findById(id: string): Promise<Profile | null>;
  search(input: { query: string; excludeUserId: string }): Promise<Profile[]>;
}
