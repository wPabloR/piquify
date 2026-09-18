import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountMovementKind, Profile } from "../../entities/profile.js";
import type ProfileDao from "../../interfaces/user/profile-dao.js";

type ProfileRow = {
  id: string;
  display_name: string;
  public_code: number;
  balance: number;
  created_at: string;
};

const profileColumns = "id, display_name, public_code, balance, created_at";

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    publicCode: row.public_code,
    balance: row.balance,
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
      .select(profileColumns)
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
      .select(profileColumns)
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

  async tryDebit(userId: string, amount: number): Promise<boolean> {
    const profile = await this.findById(userId);
    if (!profile || profile.balance < amount) {
      return false;
    }

    const { data, error } = await this.supabase
      .from("profiles")
      .update({ balance: profile.balance - amount })
      .eq("id", userId)
      .eq("balance", profile.balance)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async credit(userId: string, amount: number): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const profile = await this.findById(userId);
      if (!profile) {
        throw new Error("Profile not found");
      }

      const { data, error } = await this.supabase
        .from("profiles")
        .update({ balance: profile.balance + amount })
        .eq("id", userId)
        .eq("balance", profile.balance)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (data) {
        return;
      }
    }

    throw new Error("Could not credit points");
  }

  async hasMovement(input: {
    userId: string;
    betId: string;
    kind: AccountMovementKind;
  }): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("account_movements")
      .select("id")
      .eq("user_id", input.userId)
      .eq("bet_id", input.betId)
      .eq("kind", input.kind)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async appendMovement(input: {
    userId: string;
    amount: number;
    kind: AccountMovementKind;
    betId?: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("account_movements").insert({
      user_id: input.userId,
      amount: input.amount,
      kind: input.kind,
      bet_id: input.betId ?? null,
    });

    if (error) {
      throw error;
    }
  }
}
