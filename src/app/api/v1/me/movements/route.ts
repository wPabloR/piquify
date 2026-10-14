import { NextResponse } from "next/server";
import { requireActor } from "@/app/api/v1/_lib/http";
import { listLedgerMovements } from "@/infrastructure/queries";

export async function GET(request: Request) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const items = await listLedgerMovements(resolved.actor.id);
  return NextResponse.json(items);
}
