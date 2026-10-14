import { NextResponse } from "next/server";
import { isUuid, jsonError, requireActor } from "@/app/api/v1/_lib/http";
import { listPlaygrounds } from "@/infrastructure/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const playgrounds = await listPlaygrounds(actor.id);
  const playground = playgrounds.find((item) => item.id === id);
  if (!playground) return jsonError("NOT_FOUND");
  return NextResponse.json(playground);
}
