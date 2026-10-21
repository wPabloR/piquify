"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logger";
import { safeErrorCode, translateError } from "@/application/errors";
import { parseDisplayName, parseEmail, parseHandle, parsePassword } from "@/domain/validation";
import {
  CONFIRM_EMAIL_MESSAGE,
  authFormSnapshot,
  credentialFailure,
  isUnconfirmedEmail,
  type AuthField,
} from "@/domain/presentation";
import { safeNextPath, safeReturnPath } from "@/lib/safe-path";

export interface ActionState {
  error?: string;
  message?: string;
  values?: { name?: string; handle?: string; email?: string };
  fieldErrors?: Partial<Record<AuthField, string>>;
}

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const rawName = read(formData, "name");
  const rawHandle = read(formData, "handle");
  const rawEmail = read(formData, "email");
  const email = parseEmail(rawEmail);
  const password = parsePassword(read(formData, "password"));
  const name = parseDisplayName(rawName);
  const handle = parseHandle(rawHandle);
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  if (!name.ok) fieldErrors.name = name.message;
  if (!handle.ok) fieldErrors.handle = handle.message;
  if (!email.ok) fieldErrors.email = email.message;
  if (!password.ok) fieldErrors.password = password.message;
  if (Object.keys(fieldErrors).length > 0) {
    return authFormSnapshot({
      name: name.ok ? name.value : rawName,
      handle: handle.ok ? handle.value : rawHandle,
      email: email.ok ? email.value : rawEmail,
      errors: fieldErrors,
      formError: "Revisa los datos marcados.",
    });
  }
  if (!email.ok || !password.ok || !name.ok || !handle.ok) {
    return { error: "Revisa los datos." };
  }
  const supabase = await createClient();
  const next = safeNextPath(read(formData, "next"));
  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      emailRedirectTo: await confirmationRedirect(next),
      data: { display_name: name.value, handle: handle.value },
    },
  });
  if (error) {
    return {
      ...authFormSnapshot({
        name: name.value,
        handle: handle.value,
        email: email.value,
        errors: {},
      }),
      ...fail("sign_up", error.message),
    };
  }
  if (!data.session) {
    return {
      ...authFormSnapshot({
        name: name.value,
        handle: handle.value,
        email: email.value,
        errors: {},
      }),
      message: CONFIRM_EMAIL_MESSAGE,
    };
  }
  redirect(next ?? "/");
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const rawEmail = read(formData, "email");
  const email = parseEmail(rawEmail);
  const password = parsePassword(read(formData, "password"));
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  if (!email.ok) fieldErrors.email = email.message;
  if (!password.ok) fieldErrors.password = password.message;
  if (Object.keys(fieldErrors).length > 0) {
    return authFormSnapshot({
      email: email.ok ? email.value : rawEmail,
      errors: fieldErrors,
      formError: "Revisa los datos marcados.",
    });
  }
  if (!email.ok || !password.ok) return { error: "Revisa los datos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  });
  if (error) {
    if (isUnconfirmedEmail(error)) {
      return {
        ...authFormSnapshot({ email: email.value, errors: {} }),
        message: CONFIRM_EMAIL_MESSAGE,
      };
    }
    return credentialFailure(email.value);
  }
  redirect(safeNextPath(read(formData, "next")) ?? "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function fail(action: string, message: string): ActionState {
  logEvent("error", action, { code: safeErrorCode(message) });
  return { error: translateError(message) };
}

async function confirmationRedirect(next: string | null) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const origin =
    host === "localhost:3000" || host === "127.0.0.1:3000"
      ? "http://localhost:3000"
      : "https://piquify.vercel.app";
  return `${origin}${safeReturnPath(next) ?? "/"}`;
}

function read(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
