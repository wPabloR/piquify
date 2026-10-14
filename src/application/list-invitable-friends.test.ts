import { describe, expect, it } from "vitest";
import { listInvitableFriends } from "@/application/list-invitable-friends";
import type { FriendPerson, UnitOfWork } from "@/application/ports";

const actor = "11111111-1111-4111-8111-111111111111";
const playground = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const friend = { id: "22222222-2222-4222-8222-222222222222", name: "Biel", handle: "biel" };
const other = { id: "33333333-3333-4333-8333-333333333333", name: "Nuria", handle: "nuria" };

function memory(input: {
  friends: FriendPerson[];
  members: string[];
  pendingInvites: string[];
}) {
  const uow = {
    async listFriends() {
      return input.friends;
    },
    async isMember(_playgroundId: string, userId: string) {
      return input.members.includes(userId);
    },
    async pendingInvitationExists(_playgroundId: string, inviteeId: string) {
      return input.pendingInvites.includes(inviteeId);
    },
  };
  return uow as unknown as UnitOfWork;
}

describe("listInvitableFriends", () => {
  it("omite miembros y quienes ya tienen invitación pendiente", async () => {
    const hits = await listInvitableFriends(memory({
      friends: [friend, other],
      members: [friend.id],
      pendingInvites: [other.id],
    }), { actorId: actor, playgroundId: playground });
    expect(hits).toEqual([]);
  });

  it("devuelve amigos que aún se pueden invitar", async () => {
    const hits = await listInvitableFriends(memory({
      friends: [friend, other],
      members: [friend.id],
      pendingInvites: [],
    }), { actorId: actor, playgroundId: playground });
    expect(hits).toEqual([other]);
  });
});
