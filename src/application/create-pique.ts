import { canCreatePique } from "@/domain/access";
import { parseCreatePique } from "@/domain/validation";
import type { PiqueKind } from "@/domain/models";
import { fail, ok, type AppResult } from "@/application/result";
import type { UnitOfWork } from "@/application/ports";

export async function createPique(
  uow: UnitOfWork,
  input: {
    actorId: string;
    playgroundId: string;
    question: string;
    detail: string;
    kind: PiqueKind;
    stake: number;
    closesAt: string;
    options: string[];
    now?: Date;
  },
): Promise<AppResult<{ id: string }>> {
  const role = await uow.memberRole(input.playgroundId, input.actorId);
  if (!role || !canCreatePique(role)) return fail("NOT_ADMIN");
  const parsed = parseCreatePique({
    question: input.question,
    detail: input.detail,
    kind: input.kind,
    stake: input.stake,
    closesAt: input.closesAt,
    options: input.options,
    now: input.now,
  });
  if (!parsed.ok) return fail(parsed.code);
  const id = await uow.insertPique({
    playgroundId: input.playgroundId,
    question: parsed.value.question,
    detail: parsed.value.detail,
    kind: parsed.value.kind,
    stake: parsed.value.stake,
    closesAt: parsed.value.closesAt,
    createdBy: input.actorId,
  });
  await uow.insertOptions(id, parsed.value.options);
  await uow.insertEvent({
    playgroundId: input.playgroundId,
    actorId: input.actorId,
    piqueId: id,
    kind: "pique_created",
  });
  await uow.notifyMembers({
    playgroundId: input.playgroundId,
    actorId: input.actorId,
    body: `Nuevo pique: ${parsed.value.question}`,
    kind: "pique_opened",
    piqueId: id,
  });
  await uow.touchPlayground(input.playgroundId);
  return ok({ id });
}
