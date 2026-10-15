import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const name of [".env.local", ".env"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL es obligatorio para npm run test:integration.");
}
process.env.DATABASE_URL = databaseUrl;

const lockedUser = "00000000-0000-4000-8000-000000000001";

describe("transacción postgres", () => {
  it("abre y confirma un begin", async () => {
    const { withUnitOfWork } = await import("@/infrastructure/postgres-stores");
    const seen = await withUnitOfWork(async (uow) => {
      await uow.lockUser(lockedUser);
      return true;
    });
    expect(seen).toBe(true);
  });

  it("bloquea el ledger sin privilegio UPDATE", async () => {
    const { withUnitOfWork } = await import("@/infrastructure/postgres-stores");
    await expect(
      withUnitOfWork(async (uow) => {
        await uow.lockLedger(lockedUser);
      }),
    ).resolves.toBeUndefined();
  });

  it("el rol no puede bloquear ledger_entries con FOR UPDATE", async () => {
    const { getSql } = await import("@/infrastructure/db");
    const sql = getSql();
    await expect(
      sql`select 1 from public.ledger_entries where user_id = ${lockedUser}::uuid for update`,
    ).rejects.toThrow(/permission denied|no tiene permiso/i);
  });

  it("tiene la tabla de amistades", async () => {
    const { getSql } = await import("@/infrastructure/db");
    const sql = getSql();
    const [row] = await sql<{ ok: boolean }[]>`
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'friendships'
      ) as ok
    `;
    expect(row?.ok).toBe(true);
  });
});
