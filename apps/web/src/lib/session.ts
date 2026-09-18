import { cache } from "react";
import { redirect } from "next/navigation";
import {
  fetchMe,
  fetchNotifications,
  type MeResponse,
  type NotificationInbox,
} from "@/lib/api";
import { safePath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export const getAccessToken = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

export const getCurrentUser = cache(async (): Promise<MeResponse | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const me = await fetchMe(accessToken);
  if ("error" in me) {
    return null;
  }

  return me;
});

export const getPendingNotifications = cache(
  async (): Promise<NotificationInbox> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return { invitations: [], joinRequests: [], resultDue: [], resultVotes: [] };
    }

    const inbox = await fetchNotifications(accessToken);
    if ("error" in inbox) {
      return { invitations: [], joinRequests: [], resultDue: [], resultVotes: [] };
    }

    return {
      invitations: inbox.invitations,
      joinRequests: inbox.joinRequests,
      resultDue: inbox.resultDue ?? [],
      resultVotes: inbox.resultVotes ?? [],
    };
  },
);

export async function requireAccessToken(next?: string): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    const dest = next
      ? `/login?next=${encodeURIComponent(safePath(next))}`
      : "/login";
    redirect(dest);
  }
  return accessToken;
}
