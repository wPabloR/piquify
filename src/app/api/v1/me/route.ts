import { NextResponse } from "next/server";
import { isRecord, jsonError, mutate, requireActor } from "@/app/api/v1/_lib/http";
import { updateProfile } from "@/application/update-profile";
import { getViewerFor } from "@/infrastructure/queries";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const viewer = await getViewerFor(actor.id, { name: actor.name, handle: actor.handle });
  if (!viewer) return jsonError("NOT_FOUND");
  return NextResponse.json(viewer);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.name !== "string") return jsonError("INVALID_INPUT");
  const name = body.name;
  return mutate(request, (uow, actorId) => updateProfile(uow, { actorId, name }));
}
