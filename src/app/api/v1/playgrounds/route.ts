import { NextResponse } from "next/server";
import { isRecord, jsonError, mutate, requireActor } from "@/app/api/v1/_lib/http";
import { createPlayground } from "@/application/create-playground";
import { listPlaygrounds } from "@/infrastructure/queries";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const playgrounds = await listPlaygrounds(actor.id);
  return NextResponse.json(playgrounds);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.name !== "string") return jsonError("INVALID_INPUT");
  const name = body.name;
  const tagline = typeof body.tagline === "string" ? body.tagline : "";
  return mutate(request, (uow, actorId) =>
    createPlayground(uow, { actorId, name, tagline }),
  );
}
