import { describe, expect, it } from "vitest";
import { respondToFriendRequest } from "@/application/respond-to-friend-request";
import { removeFriend } from "@/application/remove-friend";
import { searchPeople } from "@/application/search-people";
import { sendFriendRequest } from "@/application/send-friend-request";
import type { UnitOfWork } from "@/application/ports";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";

function memory() {
  const profiles = new Map([
    [a, { id: a, name: "Ana", handle: "ana", friendCode: "K7M29QXA" }],
    [b, { id: b, name: "Biel", handle: "biel", friendCode: "A1B2C3D4" }],
  ]);
  const pending: { id: string; requesterId: string; addresseeId: string; status: string }[] = [];
  const friends = new Set<string>();
  const notices: { userId: string; kind: string }[] = [];
  let ids = 0;
  const pair = (x: string, y: string) => (x < y ? `${x}:${y}` : `${y}:${x}`);
  const uow = {
    notices,
    friends,
    pending,
    async lockUser() {},
    async profileById(userId: string) {
      return profiles.get(userId) ?? null;
    },
    async profileByFriendCode(code: string) {
      return [...profiles.values()].find((item) => item.friendCode === code) ?? null;
    },
    async friendshipExists(x: string, y: string) {
      return friends.has(pair(x, y));
    },
    async pendingFriendRequest(fromId: string, toId: string) {
      return pending.find(
        (item) => item.requesterId === fromId && item.addresseeId === toId && item.status === "pending",
      ) ?? null;
    },
    async insertFriendRequest(requesterId: string, addresseeId: string) {
      ids += 1;
      const id = `req-${ids}`;
      pending.push({ id, requesterId, addresseeId, status: "pending" });
      return id;
    },
    async lockFriendRequest(id: string) {
      return pending.find((item) => item.id === id) ?? null;
    },
    async setFriendRequestStatus(id: string, status: "accepted" | "declined") {
      const found = pending.find((item) => item.id === id);
      if (found) found.status = status;
    },
    async insertFriendship(x: string, y: string) {
      friends.add(pair(x, y));
    },
    async deleteFriendship(x: string, y: string) {
      friends.delete(pair(x, y));
    },
    async insertNotification(input: { userId: string; kind: string }) {
      notices.push({ userId: input.userId, kind: input.kind });
    },
    async searchPeople(userId: string, query: string) {
      const needle = query.toLowerCase();
      return [...profiles.values()]
        .filter((item) => item.id !== userId)
        .filter(
          (item) =>
            item.name.toLowerCase().includes(needle) ||
            item.handle.includes(needle) ||
            item.friendCode === query.toUpperCase(),
        )
        .map((item) => ({
          id: item.id,
          name: item.name,
          handle: item.handle,
          isFriend: friends.has(pair(userId, item.id)),
          pendingFromActor: pending.some(
            (req) =>
              req.requesterId === userId && req.addresseeId === item.id && req.status === "pending",
          ),
          pendingFromOther: pending.some(
            (req) =>
              req.requesterId === item.id && req.addresseeId === userId && req.status === "pending",
          ),
          incomingRequestId:
            pending.find(
              (req) =>
                req.requesterId === item.id && req.addresseeId === userId && req.status === "pending",
            )?.id ?? null,
        }));
    },
  };
  return uow as unknown as UnitOfWork & { friends: Set<string>; notices: { kind: string }[] };
}

describe("sendFriendRequest", () => {
  it("crea una solicitud pendiente por código", async () => {
    const uow = memory();
    const result = await sendFriendRequest(uow, { actorId: a, code: "a1b2-c3d4" });
    expect(result).toEqual({ ok: true, value: undefined });
    expect(uow.notices[0]?.kind).toBe("friend_request");
  });

  it("rechaza enviarse una solicitud a uno mismo", async () => {
    const uow = memory();
    const result = await sendFriendRequest(uow, { actorId: a, code: "K7M29QXA" });
    expect(result).toEqual({ ok: false, code: "INVALID_INPUT" });
  });

  it("acepta automáticamente si ya hay una solicitud inversa", async () => {
    const uow = memory();
    await sendFriendRequest(uow, { actorId: a, userId: b });
    const result = await sendFriendRequest(uow, { actorId: b, userId: a });
    expect(result.ok).toBe(true);
    expect(await uow.friendshipExists(a, b)).toBe(true);
    expect(uow.notices.at(-1)?.kind).toBe("friend_accepted");
  });

  it("rechaza si ya sois amigos", async () => {
    const uow = memory();
    await sendFriendRequest(uow, { actorId: a, userId: b });
    await respondToFriendRequest(uow, { actorId: b, requestId: "req-1", accept: true });
    const result = await sendFriendRequest(uow, { actorId: a, userId: b });
    expect(result).toEqual({ ok: false, code: "ALREADY_FRIENDS" });
  });
});

describe("respondToFriendRequest", () => {
  it("solo el destinatario puede aceptar", async () => {
    const uow = memory();
    await sendFriendRequest(uow, { actorId: a, userId: b });
    const result = await respondToFriendRequest(uow, { actorId: a, requestId: "req-1", accept: true });
    expect(result).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});

describe("removeFriend", () => {
  it("borra la amistad", async () => {
    const uow = memory();
    await sendFriendRequest(uow, { actorId: a, userId: b });
    await respondToFriendRequest(uow, { actorId: b, requestId: "req-1", accept: true });
    const result = await removeFriend(uow, { actorId: a, userId: b });
    expect(result.ok).toBe(true);
    expect(await uow.friendshipExists(a, b)).toBe(false);
  });
});

describe("searchPeople", () => {
  it("devuelve la relación de amistad", async () => {
    const uow = memory();
    await sendFriendRequest(uow, { actorId: a, userId: b });
    const hits = await searchPeople(uow, { actorId: a, query: "biel" });
    expect(hits[0]).toMatchObject({ handle: "biel", relation: "outgoing" });
  });
});
