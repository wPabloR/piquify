import { jsonError, isUuid, mutate } from "@/app/api/v1/_lib/http";
import { proposeResult } from "@/application/propose-result";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("INVALID_INPUT");
  const body = (await request.json().catch(() => null)) as { optionId?: string } | null;
  const optionId = body?.optionId;
  if (!optionId || !isUuid(optionId)) {
    return jsonError("INVALID_INPUT");
  }
  return mutate(request, (uow, actorId) =>
    proposeResult(uow, { actorId, piqueId: id, optionId }),
  );
}
