export interface HealthEnv {
  supabaseUrl?: string | null;
  supabaseKey?: string | null;
  databaseUrl?: string | null;
}

export interface HealthReport {
  ok: boolean;
  status: 200 | 503;
  checks: { env: boolean; database: boolean };
}

function envReady(env: HealthEnv): boolean {
  return Boolean(env.supabaseUrl && env.supabaseKey && env.databaseUrl);
}

export async function checkHealth(input: {
  env: HealthEnv;
  ping: () => Promise<boolean>;
}): Promise<HealthReport> {
  const env = envReady(input.env);
  const database = env ? await input.ping() : false;
  const ok = env && database;
  return { ok, status: ok ? 200 : 503, checks: { env, database } };
}
