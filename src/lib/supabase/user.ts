import { createClient as createJsClient } from "@supabase/supabase-js";
import { readEnv } from "@/lib/env";

export function createUserClient(accessToken: string) {
  return createJsClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
