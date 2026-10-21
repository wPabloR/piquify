const ALLOWED_ORIGINS = new Set(["https://piquify.vercel.app", "http://localhost:3000"]);

export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("://")) return null;
  return value;
}

/** Ruta interna, o una URL absoluta de producción o de localhost:3000. */
export function safeReturnPath(value: string | null | undefined): string | null {
  const relative = safeNextPath(value);
  if (relative) return relative;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!ALLOWED_ORIGINS.has(url.origin)) return null;
    return safeNextPath(`${url.pathname}${url.search}`) ?? "/";
  } catch {
    return null;
  }
}
