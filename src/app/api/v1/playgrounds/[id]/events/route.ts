import { NextResponse } from "next/server";
import { isUuid, jsonError, requireActor } from "@/app/api/v1/_lib/http";
import { listPlaygroundHistory } from "@/infrastructure/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const events = await listPlaygroundHistory(id, actor.id);
  return NextResponse.json(events);
}
