import { cache } from "react";
import { redirect } from "next/navigation";
import { fetchMe, type MeResponse } from "@/lib/api";
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

export async function requireAccessToken(): Promise<string> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }
  return accessToken;
}
