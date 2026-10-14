import { NextResponse } from "next/server";
import { requireActor } from "@/app/api/v1/_lib/http";
import { searchPeople } from "@/application/search-people";
import { searchPlaygrounds } from "@/application/search-playgrounds";
import { withUnitOfWork } from "@/infrastructure/postgres-stores";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const [playgrounds, people] = await withUnitOfWork(async (uow) =>
    Promise.all([
      searchPlaygrounds(uow, { actorId: actor.id, query }),
      searchPeople(uow, { actorId: actor.id, query }),
    ]),
  );
  return NextResponse.json({ playgrounds, people });
}
