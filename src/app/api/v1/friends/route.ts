import { NextResponse } from "next/server";
import { requireActor } from "@/app/api/v1/_lib/http";
import { withUnitOfWork } from "@/infrastructure/postgres-stores";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actorId = resolved.actor.id;
  const payload = await withUnitOfWork(async (uow) => {
    const [friends, pending] = await Promise.all([
      uow.listFriends(actorId),
      uow.listPendingFriendRequests(actorId),
    ]);
    return {
      friends,
      incoming: pending.filter((item) => item.direction === "incoming"),
      outgoing: pending.filter((item) => item.direction === "outgoing"),
    };
  });
  return NextResponse.json(payload);
}
