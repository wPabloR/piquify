import { parseDisplayName } from "@/domain/validation";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function updateProfile(
  uow: UnitOfWork,
  input: { actorId: string; name: string },
): Promise<AppResult> {
  const name = parseDisplayName(input.name);
  if (!name.ok) return fail(name.code);
  await uow.updateDisplayName(input.actorId, name.value);
  return ok();
}
