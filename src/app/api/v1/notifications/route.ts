import { NextResponse } from "next/server";
import { requireActor } from "@/app/api/v1/_lib/http";
import { listActivity } from "@/infrastructure/queries";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const items = await listActivity(40, actor.id);
  return NextResponse.json(items);
}
