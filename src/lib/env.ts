export function readEnv(
  name:
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    | "DATABASE_URL",
) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable ${name}.`);
  }
  return value;
}

export function optionalEnv(name: "DATABASE_URL") {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}
