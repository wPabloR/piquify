import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminJoinRequest,
  JoinRequest,
  JoinRequestStatus,
} from "../../entities/join-request.js";
import type { PlaygroundJoinRequest } from "../../entities/playground.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";

type JoinRequestRow = {
  id: string;
  playground_id: string;
  user_id: string;
  status: JoinRequestStatus;
  created_at: string;
};

type PendingJoinRequestRow = JoinRequestRow & {
  playgrounds: { name: string } | { name: string }[] | null;
  profiles:
    | { display_name: string; public_code: number }
    | { display_name: string; public_code: number }[]
    | null;
};

function asSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function mapJoinRequest(row: JoinRequestRow): JoinRequest {
  return {
    id: row.id,
    playgroundId: row.playground_id,
    userId: row.user_id,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

const joinRequestColumns = "id, playground_id, user_id, status, created_at";

export default class SupabaseJoinRequestDao implements JoinRequestDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<JoinRequest | null> {
    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .select(joinRequestColumns)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapJoinRequest(data as JoinRequestRow);
  }

  async findForPlaygroundUser(
    playgroundId: string,
    userId: string,
  ): Promise<JoinRequest | null> {
    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .select(joinRequestColumns)
      .eq("playground_id", playgroundId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapJoinRequest(data as JoinRequestRow);
  }

  async listPendingPlaygroundIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .select("playground_id")
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    return ((data ?? []) as { playground_id: string }[]).map(
      (row) => row.playground_id,
    );
  }

  async listPendingForPlayground(
    playgroundId: string,
  ): Promise<PlaygroundJoinRequest[]> {
    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .select(
        "id, playground_id, user_id, status, created_at, profiles(display_name, public_code)",
      )
      .eq("playground_id", playgroundId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PendingJoinRequestRow[];
    const requests: PlaygroundJoinRequest[] = [];

    for (const row of rows) {
      const profile = asSingle(row.profiles);
      requests.push({
        id: row.id,
        userId: row.user_id,
        displayName: profile?.display_name ?? "user",
        publicCode: profile?.public_code ?? 0,
        createdAt: new Date(row.created_at),
      });
    }

    return requests;
  }

  async listPendingForPlaygrounds(
    playgroundIds: string[],
  ): Promise<AdminJoinRequest[]> {
    if (playgroundIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .select(
        "id, playground_id, user_id, status, created_at, playgrounds(name), profiles(display_name, public_code)",
      )
      .in("playground_id", playgroundIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as PendingJoinRequestRow[];
    const requests: AdminJoinRequest[] = [];

    for (const row of rows) {
      const playground = asSingle(row.playgrounds);
      const profile = asSingle(row.profiles);
      requests.push({
        id: row.id,
        playgroundId: row.playground_id,
        playgroundName: playground?.name ?? "Playground",
        userId: row.user_id,
        displayName: profile?.display_name ?? "user",
        publicCode: profile?.public_code ?? 0,
        createdAt: new Date(row.created_at),
      });
    }

    return requests;
  }

  async create(input: {
    playgroundId: string;
    userId: string;
  }): Promise<JoinRequest> {
    const { data, error } = await this.supabase
      .from("playground_join_requests")
      .insert({
        playground_id: input.playgroundId,
        user_id: input.userId,
        status: "pending",
      })
      .select(joinRequestColumns)
      .single();

    if (error) {
      throw error;
    }

    return mapJoinRequest(data as JoinRequestRow);
  }

  async updateStatus(id: string, status: JoinRequestStatus): Promise<void> {
    const { error } = await this.supabase
      .from("playground_join_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
