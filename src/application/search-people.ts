import { friendRelation, parseFriendCode } from "@/domain/friends";
import type { UnitOfWork } from "@/application/ports";
import type { SearchPersonView } from "@/domain/views";

export async function searchPeople(
  uow: UnitOfWork,
  input: { actorId: string; query: string },
): Promise<SearchPersonView[]> {
  const needle = input.query.trim();
  const code = parseFriendCode(needle);
  if (needle.length < 2 && !code.ok) return [];
  const people = await uow.searchPeople(input.actorId, needle);
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    handle: person.handle,
    relation: friendRelation({
      isFriend: person.isFriend,
      pendingFromActor: person.pendingFromActor,
      pendingFromOther: person.pendingFromOther,
    }),
    incomingRequestId: person.incomingRequestId,
  }));
}
