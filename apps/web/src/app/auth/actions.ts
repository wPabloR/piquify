"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safePath } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nextFrom(formData: FormData) {
  return safePath(formData.get("next"));
}

function withNext(path: string, next: string) {
  if (next === "/") {
    return path;
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(next)}`;
}

export async function signIn(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = nextFrom(formData);

  if (!email || !password) {
    redirect(withNext("/login?error=Email%20y%20contrase%C3%B1a%20son%20obligatorios", next));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(withNext(`/login?error=${encodeURIComponent(error.message)}`, next));
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const displayName = field(formData, "displayName");
  const next = nextFrom(formData);

  if (!email || !password || !displayName) {
    redirect(withNext("/signup?error=Rellena%20todos%20los%20campos", next));
  }

  if (displayName.length > 50) {
    redirect(
      withNext("/signup?error=El%20alias%20debe%20tener%20como%20mucho%2050%20caracteres", next),
    );
  }

  if (password.length < 6) {
    redirect(
      withNext("/signup?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%206%20caracteres", next),
    );
  }

  const origin =
    (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect(withNext(`/signup?error=${encodeURIComponent(error.message)}`, next));
  }

  if (!data.session) {
    redirect(
      withNext("/login?error=Revisa%20el%20correo%20para%20confirmar%20la%20cuenta", next),
    );
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
