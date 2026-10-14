import { translateError } from "@/application/errors";

export async function apiRequest<T = Record<string, never>>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const response = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  } & T;
  if (!response.ok) {
    const code = body.error?.code ?? "UNEXPECTED";
    return { ok: false, error: body.error?.message ?? translateError(code) };
  }
  return { ok: true, data: body as T };
}
