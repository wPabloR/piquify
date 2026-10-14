import { describe, expect, it } from "vitest";
import { cookieMutationAllowed, readBearer } from "@/app/api/v1/_lib/identity";
import { statusForCode } from "@/application/errors";

describe("readBearer", () => {
  it("lee el token", () => {
    expect(readBearer("Bearer abc.def")).toBe("abc.def");
    expect(readBearer("Basic x")).toBeNull();
  });
});

describe("cookieMutationAllowed", () => {
  it("exige el mismo host", () => {
    expect(cookieMutationAllowed("http://localhost:3000", "localhost:3000")).toBe(true);
    expect(cookieMutationAllowed("https://evil.test", "localhost:3000")).toBe(false);
    expect(cookieMutationAllowed(null, "localhost:3000")).toBe(false);
  });
});

describe("statusForCode", () => {
  it("mapea códigos de dominio", () => {
    expect(statusForCode("UNAUTHENTICATED")).toBe(401);
    expect(statusForCode("NOT_ADMIN")).toBe(403);
    expect(statusForCode("NOT_FOUND")).toBe(404);
    expect(statusForCode("INSUFFICIENT_BALANCE")).toBe(409);
    expect(statusForCode("INVALID_INPUT")).toBe(422);
  });
});
