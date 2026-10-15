import { describe, expect, it } from "vitest";
import { checkHealth } from "@/application/health";

const readyEnv = {
  supabaseUrl: "https://example.supabase.co",
  supabaseKey: "sb_publishable_ci",
  databaseUrl: "postgresql://piquify_app:x@localhost:5432/postgres",
};

describe("health", () => {
  it("está ok cuando el entorno y la base responden", async () => {
    await expect(
      checkHealth({
        env: readyEnv,
        ping: async () => true,
      }),
    ).resolves.toEqual({
      ok: true,
      status: 200,
      checks: { env: true, database: true },
    });
  });

  it("falla si falta una variable", async () => {
    await expect(
      checkHealth({
        env: { ...readyEnv, databaseUrl: "" },
        ping: async () => true,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 503,
      checks: { env: false, database: false },
    });
  });

  it("falla si la base no responde", async () => {
    await expect(
      checkHealth({
        env: readyEnv,
        ping: async () => false,
      }),
    ).resolves.toEqual({
      ok: false,
      status: 503,
      checks: { env: true, database: false },
    });
  });
});
