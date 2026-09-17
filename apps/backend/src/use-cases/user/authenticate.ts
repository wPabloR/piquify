import type { AuthTokenVerifier } from "../../interfaces/user/auth-token-verifier.js";

export default class AuthenticateUserUseCase {
  constructor(private readonly authTokenVerifier: AuthTokenVerifier) {}

  async call(token: string): Promise<{ userId: string }> {
    return this.authTokenVerifier.verify(token);
  }
}
