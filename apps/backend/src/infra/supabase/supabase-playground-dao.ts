import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

type PlaygroundRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MembershipRow = {
  role: PlaygroundRole;
  playgrounds: PlaygroundRow | PlaygroundRow[] | null;
};

type MemberRow = {
  user_id: string;
  role: PlaygroundRole;
  joined_at: string;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

function mapPlayground(row: PlaygroundRow): Playground {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  };
}

function asSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export default class SupabasePlaygroundDao implements PlaygroundDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async listForUser(userId: string): Promise<PlaygroundSummary[]> {
    const { data, error } = await this.supabase
      .from("playground_members")
      .select("role, playgrounds(id, name, created_by, created_at)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as MembershipRow[];
    const playgrounds: PlaygroundSummary[] = [];

    for (const row of rows) {
      const playground = asSingle(row.playgrounds);
      if (!playground) {
        continue;
      }
      playgrounds.push({ ...mapPlayground(playground), role: row.role });
    }

    return playgrounds;
  }

  async create(input: { name: string; createdBy: string }): Promise<Playground> {
    const { data, error } = await this.supabase
      .from("playgrounds")
      .insert({ name: input.name, created_by: input.createdBy })
      .select("id, name, created_by, created_at")
      .single();

    if (error) {
      throw error;
    }

    return mapPlayground(data as PlaygroundRow);
  }

  async findById(id: string): Promise<Playground | null> {
    const { data, error } = await this.supabase
      .from("playgrounds")
      .select("id, name, created_by, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapPlayground(data as PlaygroundRow);
  }

  async findMembership(
    playgroundId: string,
    userId: string,
  ): Promise<PlaygroundRole | null> {
    const { data, error } = await this.supabase
      .from("playground_members")
      .select("role")
      .eq("playground_id", playgroundId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.role as PlaygroundRole | undefined) ?? null;
  }

  async listMembers(playgroundId: string): Promise<PlaygroundMember[]> {
    const { data, error } = await this.supabase
      .from("playground_members")
      .select("user_id, role, joined_at, profiles(display_name)")
      .eq("playground_id", playgroundId)
      .order("joined_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as MemberRow[];
    const members: PlaygroundMember[] = [];

    for (const row of rows) {
      const profile = asSingle(row.profiles);
      members.push({
        userId: row.user_id,
        displayName: profile?.display_name ?? "user",
        role: row.role,
        joinedAt: new Date(row.joined_at),
      });
    }

    return members;
  }
}
