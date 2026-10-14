import { ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function markNotificationsRead(
  uow: UnitOfWork,
  input: { actorId: string },
): Promise<AppResult> {
  await uow.markNotificationsRead(input.actorId);
  return ok();
}
