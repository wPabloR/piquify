import type { SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedError } from "../../errors/http-error.js";
import type { AuthTokenVerifier } from "../../interfaces/user/auth-token-verifier.js";

// Not a DAO: Auth is an external provider, not one of our tables.
export default class SupabaseAuthTokenVerifier implements AuthTokenVerifier {
  constructor(private readonly supabase: SupabaseClient) {}

  async verify(token: string): Promise<{ userId: string }> {
    const { data, error } = await this.supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;

    if (error || typeof userId !== "string" || userId.length === 0) {
      throw new UnauthorizedError();
    }

    return { userId };
  }
}
