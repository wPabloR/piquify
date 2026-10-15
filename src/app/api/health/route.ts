import { NextResponse } from "next/server";
import { checkHealth } from "@/application/health";
import { getSql, hasDatabaseUrl } from "@/infrastructure/db";

export const dynamic = "force-dynamic";

async function pingDatabase() {
  if (!hasDatabaseUrl()) return false;
  try {
    const sql = getSql();
    const [row] = await sql<{ ok: number }[]>`select 1 as ok`;
    return row?.ok === 1;
  } catch {
    return false;
  }
}

export async function GET() {
  const report = await checkHealth({
    env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      databaseUrl: process.env.DATABASE_URL,
    },
    ping: pingDatabase,
  });
  return NextResponse.json(
    { ok: report.ok, checks: report.checks },
    { status: report.status },
  );
}
