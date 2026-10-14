import { describe, expect, it } from "vitest";
import { ensureAccount } from "@/application/ensure-account";
import type { UnitOfWork } from "@/application/ports";

function memory(): UnitOfWork & {
  profiles: Map<string, { id: string; name: string; handle: string; friendCode: string }>;
  opening: string[];
} {
  const profiles = new Map<string, { id: string; name: string; handle: string; friendCode: string }>();
  const opening: string[] = [];
  const uow = {
    profiles,
    opening,
    async lockUser() {},
    async profileById(userId: string) {
      return profiles.get(userId) ?? null;
    },
    async profileByHandle(handle: string) {
      return [...profiles.values()].find((item) => item.handle === handle) ?? null;
    },
    async profileByFriendCode(code: string) {
      return [...profiles.values()].find((item) => item.friendCode === code) ?? null;
    },
    async insertProfile(input: {
      id: string;
      name: string;
      handle: string;
      friendCode: string;
    }) {
      profiles.set(input.id, input);
    },
    async insertOpeningBalance(userId: string) {
      opening.push(userId);
    },
  };
  return uow as unknown as UnitOfWork & {
    profiles: Map<string, { id: string; name: string; handle: string; friendCode: string }>;
    opening: string[];
  };
}

describe("ensureAccount", () => {
  it("crea perfil y saldo inicial una sola vez", async () => {
    const uow = memory();
    const first = await ensureAccount(uow, {
      actorId: "33333333-3333-4333-8333-333333333333",
      name: "Nuria",
      handle: "nuria",
    });
    const second = await ensureAccount(uow, {
      actorId: "33333333-3333-4333-8333-333333333333",
      name: "Otro",
      handle: "otro",
    });
    expect(first.id).toBe("33333333-3333-4333-8333-333333333333");
    expect(first.name).toBe("Nuria");
    expect(first.handle).toBe("nuria");
    expect(first.friendCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(second).toEqual(first);
    expect(uow.opening).toEqual(["33333333-3333-4333-8333-333333333333"]);
  });

  it("elige otro usuario si el handle ya existe", async () => {
    const uow = memory();
    await ensureAccount(uow, {
      actorId: "11111111-1111-4111-8111-111111111111",
      handle: "nuria",
    });
    const other = await ensureAccount(uow, {
      actorId: "22222222-2222-4222-8222-222222222222",
      handle: "nuria",
    });
    expect(other.handle).not.toBe("nuria");
    expect(other.handle.startsWith("nuria")).toBe(true);
  });
});
