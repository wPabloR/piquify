import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function requestAccess(
  uow: UnitOfWork,
  input: { actorId: string; playgroundId?: string; code?: string },
): Promise<AppResult> {
  let playground: { id: string; adminId: string } | null = null;
  if (input.playgroundId) {
    const found = await uow.playgroundById(input.playgroundId);
    playground = found ? { id: found.id, adminId: found.adminId } : null;
  }
  if (!playground && input.code) {
    const code = input.code.trim().toLowerCase();
    if (!/^[a-f0-9]{8}$/.test(code)) return fail("INVALID_INPUT");
    playground = await uow.playgroundByCode(code);
  }
  if (!playground) return fail("NOT_FOUND");
  if (await uow.isMember(playground.id, input.actorId)) return fail("ALREADY_MEMBER");
  if (await uow.pendingRequestExists(playground.id, input.actorId)) return fail("REQUEST_EXISTS");
  await uow.insertJoinRequest(playground.id, input.actorId);
  await uow.insertNotification({
    userId: playground.adminId,
    playgroundId: playground.id,
    actorId: input.actorId,
    body: "Hay una solicitud nueva para entrar.",
    kind: "join_request",
  });
  await uow.touchPlayground(playground.id);
  return ok();
}
