import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../../errors/http-error.js";
import type { AuthTokenVerifier } from "../../interfaces/user/auth-token-verifier.js";
import AuthenticateUserUseCase from "./authenticate.js";

class FakeAuthTokenVerifier implements AuthTokenVerifier {
  public receivedToken: string | null = null;

  async verify(token: string): Promise<{ userId: string }> {
    this.receivedToken = token;
    return { userId: "user-1" };
  }
}

class FailingAuthTokenVerifier implements AuthTokenVerifier {
  async verify(_token: string): Promise<{ userId: string }> {
    throw new UnauthorizedError();
  }
}

describe("AuthenticateUserUseCase", () => {
  it("returns the authenticated user id", async () => {
    const verifier = new FakeAuthTokenVerifier();
    const useCase = new AuthenticateUserUseCase(verifier);
    const result = await useCase.call("valid-token");
    expect(result).toEqual({ userId: "user-1" });
  });

  it("calls the auth token verifier with the given token", async () => {
    const verifier = new FakeAuthTokenVerifier();
    const useCase = new AuthenticateUserUseCase(verifier);
    await useCase.call("TOKEN");
    expect(verifier.receivedToken).toBe("TOKEN");
  });

  it("throws when the token verifier rejects the token", async () => {
    const verifier = new FailingAuthTokenVerifier();
    const useCase = new AuthenticateUserUseCase(verifier);
    await expect(useCase.call("invalid-token")).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
