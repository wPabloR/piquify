import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../../entities/profile.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

type ProfileRow = {
  id: string;
  display_name: string;
  public_code: number;
  created_at: string;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    publicCode: row.public_code,
    createdAt: new Date(row.created_at),
  };
}

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export default class SupabaseProfileDao implements ProfileDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("id, display_name, public_code, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapProfile(data as ProfileRow);
  }

  async search(input: {
    query: string;
    excludeUserId: string;
  }): Promise<Profile[]> {
    const trimmed = input.query.trim();
    const codeQuery = trimmed.replace(/^#/, "");
    const isCode = /^\d+$/.test(codeQuery);

    let request = this.supabase
      .from("profiles")
      .select("id, display_name, public_code, created_at")
      .neq("id", input.excludeUserId)
      .limit(8);

    if (isCode) {
      const width = Math.max(4, codeQuery.length);
      const min = Number(codeQuery.padEnd(width, "0"));
      const max = Number(codeQuery.padEnd(width, "9"));
      request = request.gte("public_code", min).lte("public_code", max);
    } else {
      request = request.ilike("display_name", `%${escapeIlike(trimmed)}%`);
    }

    const { data, error } = await request;

    if (error) {
      throw error;
    }

    return ((data ?? []) as ProfileRow[]).map(mapProfile);
  }
}
