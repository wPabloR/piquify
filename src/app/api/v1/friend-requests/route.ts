import { isRecord, jsonError, mutate } from "@/app/api/v1/_lib/http";
import { sendFriendRequest } from "@/application/send-friend-request";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isRecord(body)) return jsonError("INVALID_INPUT");
  const code = typeof body.code === "string" ? body.code : undefined;
  const userId = typeof body.userId === "string" ? body.userId : undefined;
  if (!code && !userId) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) => sendFriendRequest(uow, { actorId, code, userId }));
}
