import { NextResponse } from "next/server";
import { isRecord, isUuid, jsonError, mutate, requireActor } from "@/app/api/v1/_lib/http";
import { createPique } from "@/application/create-pique";
import type { PiqueKind } from "@/domain/models";
import { listPiques } from "@/infrastructure/queries";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  const actor = resolved.actor;
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const piques = await listPiques(id, actor.id);
  return NextResponse.json(piques);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = await request.json().catch(() => null);
  if (
    !isRecord(body) ||
    typeof body.question !== "string" ||
    typeof body.kind !== "string" ||
    typeof body.stake !== "number" ||
    typeof body.closesAt !== "string" ||
    !Array.isArray(body.options)
  ) {
    return jsonError("INVALID_INPUT");
  }
  const question = body.question;
  const kind = body.kind as PiqueKind;
  const stake = body.stake;
  const closesAt = body.closesAt;
  const options = body.options.filter((item: unknown): item is string => typeof item === "string");
  const detail = typeof body.detail === "string" ? body.detail : "";
  return mutate(request, (uow, actorId) =>
    createPique(uow, {
      actorId,
      playgroundId: id,
      question,
      detail,
      kind,
      stake,
      closesAt,
      options,
    }),
  );
}
