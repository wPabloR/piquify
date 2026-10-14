import "server-only";
import postgres from "postgres";
import { optionalEnv } from "@/lib/env";

let client: postgres.Sql | null = null;

export function getSql(): postgres.Sql {
  const url = optionalEnv("DATABASE_URL");
  if (!url) {
    throw new Error("Falta la variable DATABASE_URL.");
  }
  if (!client) {
    client = postgres(url, { prepare: false, max: 3, idle_timeout: 20 });
  }
  return client;
}

export function hasDatabaseUrl() {
  return Boolean(optionalEnv("DATABASE_URL"));
}
