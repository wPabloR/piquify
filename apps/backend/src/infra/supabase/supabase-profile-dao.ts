import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../../entities/profile.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

type ProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
};

export default class SupabaseProfileDao implements ProfileDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, display_name, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const row = data as ProfileRow;
    return {
      id: row.id,
      displayName: row.display_name,
      createdAt: new Date(row.created_at),
    };
  }
}
