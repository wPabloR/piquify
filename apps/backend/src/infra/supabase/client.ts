import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env.js";

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
} as const;

export function createAuthClient(): SupabaseClient {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    auth: authOptions,
  });
}

export function createUserClient(accessToken: string): SupabaseClient {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: authOptions,
  });
}
