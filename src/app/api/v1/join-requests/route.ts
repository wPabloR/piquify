import { isRecord, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { requestAccess } from "@/application/request-access";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body) || typeof body.code !== "string") return jsonError("INVALID_INPUT");
  const code = body.code;
  return mutate(request, (uow, actorId) => requestAccess(uow, { actorId, code }));
}
