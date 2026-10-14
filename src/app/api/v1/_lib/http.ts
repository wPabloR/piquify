import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createUserClient } from "@/lib/supabase/user";
import { errorPayload, statusForCode } from "@/application/errors";
import { ensureAccount } from "@/application/ensure-account";
import { logEvent } from "@/lib/logger";
import type { AppResult } from "@/application/result";
import { withUnitOfWork } from "@/infrastructure/postgres-stores";
import type { UnitOfWork } from "@/application/ports";
import {
  cookieMutationAllowed,
  isMutatingMethod,
  readBearer,
} from "@/app/api/v1/_lib/identity";

export interface Actor {
  id: string;
  via: "bearer" | "cookie";
  name?: string;
  handle?: string;
}

function hintsFromClaims(claims: object): Pick<Actor, "name" | "handle"> {
  const record = claims as Record<string, unknown>;
  const meta =
    typeof record.user_metadata === "object" && record.user_metadata !== null
      ? (record.user_metadata as Record<string, unknown>)
      : {};
  return {
    name: typeof meta.display_name === "string" ? meta.display_name : undefined,
    handle: typeof meta.handle === "string" ? meta.handle : undefined,
  };
}

export async function resolveActor(request: Request): Promise<Actor | null> {
  const bearer = readBearer(request.headers.get("authorization"));
  if (bearer) {
    const supabase = createUserClient(bearer);
    const { data } = await supabase.auth.getClaims(bearer);
    const id = data?.claims.sub;
    if (!data || typeof id !== "string" || id.length === 0) return null;
    return { id, via: "bearer", ...hintsFromClaims(data.claims) };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!data || typeof id !== "string" || id.length === 0) return null;
  if (isMutatingMethod(request.method)) {
    const allowed = cookieMutationAllowed(
      request.headers.get("origin"),
      request.headers.get("host"),
    );
    if (!allowed) return null;
  }
  return { id, via: "cookie", ...hintsFromClaims(data.claims) };
}

export function jsonError(code: string, extraStatus?: number) {
  return NextResponse.json(errorPayload(code), { status: extraStatus ?? statusForCode(code) });
}

export async function requireActor(request: Request) {
  const actor = await resolveActor(request);
  if (!actor) return { ok: false as const, response: jsonError("UNAUTHENTICATED", 401) };
  return { ok: true as const, actor };
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function mutate<T>(
  request: Request,
  work: (uow: UnitOfWork, actorId: string) => Promise<AppResult<T>>,
) {
  const resolved = await requireActor(request);
  if (!resolved.ok) return resolved.response;
  try {
    const result = await withUnitOfWork(async (uow) => {
      await ensureAccount(uow, {
        actorId: resolved.actor.id,
        name: resolved.actor.name,
        handle: resolved.actor.handle,
      });
      return work(uow, resolved.actor.id);
    });
    if (!result.ok) {
      logEvent("error", "api_mutation", { code: result.code });
      return jsonError(result.code);
    }
    return NextResponse.json(result.value === undefined ? {} : result.value);
  } catch (error) {
    logEvent("error", "api_mutation", { code: "UNEXPECTED" });
    throw error;
  }
}

export { type AppResult };
