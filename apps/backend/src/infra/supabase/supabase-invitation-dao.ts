import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Invitation,
  InvitationStatus,
  ReceivedInvitation,
} from "../../entities/invitation.js";
import type InvitationDao from "../../interfaces/invitation/invitation-dao.js";

type InvitationRow = {
  id: string;
  playground_id: string;
  invited_user_id: string;
  invited_by: string;
  status: InvitationStatus;
  created_at: string;
};

type ReceivedInvitationRow = InvitationRow & {
  playgrounds: { name: string } | { name: string }[] | null;
  inviter: { display_name: string; public_code: number } | { display_name: string; public_code: number }[] | null;
};

function asSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function mapInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    playgroundId: row.playground_id,
    invitedUserId: row.invited_user_id,
    invitedBy: row.invited_by,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}

export default class SupabaseInvitationDao implements InvitationDao {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.supabase
      .from("playground_invitations")
      .select(
        "id, playground_id, invited_user_id, invited_by, status, created_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapInvitation(data as InvitationRow);
  }

  async findForPlaygroundUser(
    playgroundId: string,
    userId: string,
  ): Promise<Invitation | null> {
    const { data, error } = await this.supabase
      .from("playground_invitations")
      .select(
        "id, playground_id, invited_user_id, invited_by, status, created_at",
      )
      .eq("playground_id", playgroundId)
      .eq("invited_user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    return mapInvitation(data as InvitationRow);
  }

  async listPendingUserIds(playgroundId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("playground_invitations")
      .select("invited_user_id")
      .eq("playground_id", playgroundId)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    return ((data ?? []) as { invited_user_id: string }[]).map(
      (row) => row.invited_user_id,
    );
  }

  async listPendingForUser(userId: string): Promise<ReceivedInvitation[]> {
    const { data, error } = await this.supabase
      .from("playground_invitations")
      .select(
        "id, playground_id, invited_user_id, invited_by, status, created_at, playgrounds(name), inviter:profiles!playground_invitations_invited_by_fkey(display_name, public_code)",
      )
      .eq("invited_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as ReceivedInvitationRow[];
    const invitations: ReceivedInvitation[] = [];

    for (const row of rows) {
      const playground = asSingle(row.playgrounds);
      const inviter = asSingle(row.inviter);
      invitations.push({
        id: row.id,
        playgroundId: row.playground_id,
        playgroundName: playground?.name ?? "Playground",
        invitedByName: inviter?.display_name ?? "user",
        invitedByPublicCode: inviter?.public_code ?? 0,
        createdAt: new Date(row.created_at),
      });
    }

    return invitations;
  }

  async create(input: {
    playgroundId: string;
    invitedUserId: string;
    invitedBy: string;
  }): Promise<Invitation> {
    const { data, error } = await this.supabase
      .from("playground_invitations")
      .insert({
        playground_id: input.playgroundId,
        invited_user_id: input.invitedUserId,
        invited_by: input.invitedBy,
        status: "pending",
      })
      .select(
        "id, playground_id, invited_user_id, invited_by, status, created_at",
      )
      .single();

    if (error) {
      throw error;
    }

    return mapInvitation(data as InvitationRow);
  }

  async updateStatus(
    id: string,
    status: InvitationStatus,
    invitedBy?: string,
  ): Promise<void> {
    const values: { status: InvitationStatus; invited_by?: string } = { status };
    if (invitedBy) {
      values.invited_by = invitedBy;
    }

    const { error } = await this.supabase
      .from("playground_invitations")
      .update(values)
      .eq("id", id);

    if (error) {
      throw error;
    }
  }
}
