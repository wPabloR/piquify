import { generateFriendCode } from "@/domain/friends";
import { parseDisplayName, parseHandle } from "@/domain/validation";
import type { UnitOfWork } from "@/application/ports";

export interface AccountHints {
  actorId: string;
  name?: string;
  handle?: string;
}

export async function ensureAccount(
  uow: UnitOfWork,
  input: AccountHints,
): Promise<{ id: string; name: string; handle: string; friendCode: string }> {
  await uow.lockUser(input.actorId);
  const existing = await uow.profileById(input.actorId);
  if (existing) return existing;

  const parsedName = input.name ? parseDisplayName(input.name) : null;
  const name = parsedName?.ok ? parsedName.value : "Jugador";
  const parsedHandle = input.handle ? parseHandle(input.handle) : null;
  const base = parsedHandle?.ok ? parsedHandle.value : "user";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const handle = attempt === 0 ? base : uniqueHandle(base, attempt);
    const taken = await uow.profileByHandle(handle);
    if (taken) continue;
    let friendCode = generateFriendCode();
    for (let codeAttempt = 0; codeAttempt < 8; codeAttempt += 1) {
      const codeTaken = await uow.profileByFriendCode(friendCode);
      if (!codeTaken) break;
      friendCode = generateFriendCode();
    }
    if (await uow.profileByFriendCode(friendCode)) continue;
    await uow.insertProfile({ id: input.actorId, name, handle, friendCode });
    await uow.insertOpeningBalance(input.actorId);
    return { id: input.actorId, name, handle, friendCode };
  }

  throw new Error("INVALID_INPUT");
}

function uniqueHandle(base: string, attempt: number) {
  const suffix = `${attempt}${crypto.randomUUID().replaceAll("-", "").slice(0, 4)}`;
  return `${base.slice(0, 24 - suffix.length)}${suffix}`;
}
