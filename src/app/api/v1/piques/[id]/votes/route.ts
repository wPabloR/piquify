import { jsonError, isUuid, mutate } from "@/app/api/v1/_lib/http";
import { voteResult } from "@/application/vote-result";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = (await request.json().catch(() => null)) as {
    decision?: string;
    suggestedOptionId?: string | null;
  } | null;
  const decision = body?.decision;
  if (decision !== "approve" && decision !== "reject") {
    return jsonError("INVALID_INPUT");
  }
  const suggested =
    typeof body?.suggestedOptionId === "string" && body.suggestedOptionId.length > 0
      ? body.suggestedOptionId
      : null;
  if (suggested && !isUuid(suggested)) return jsonError("INVALID_INPUT");
  return mutate(request, (uow, actorId) =>
    voteResult(uow, {
      actorId,
      piqueId: id,
      decision,
      suggestedOptionId: suggested,
    }),
  );
}
