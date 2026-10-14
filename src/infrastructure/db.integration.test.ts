import { describe, expect, it } from "vitest";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("transacción postgres", () => {
  it("abre y confirma un begin", async () => {
    const { withUnitOfWork } = await import("@/infrastructure/postgres-stores");
    const seen = await withUnitOfWork(async (uow) => {
      await uow.lockUser("00000000-0000-4000-8000-000000000001");
      return true;
    });
    expect(seen).toBe(true);
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
