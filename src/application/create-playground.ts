import { parsePlayground } from "@/domain/validation";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function createPlayground(
  uow: UnitOfWork,
  input: { actorId: string; name: string; tagline: string },
): Promise<AppResult<{ id: string }>> {
  const parsed = parsePlayground({ name: input.name, tagline: input.tagline });
  if (!parsed.ok) return fail(parsed.code);
  const id = await uow.insertPlayground({
    name: parsed.value.name,
    tagline: parsed.value.tagline,
    emoji: parsed.value.emoji,
    adminId: input.actorId,
  });
  await uow.addMember(id, input.actorId, "admin");
  return ok({ id });
}
