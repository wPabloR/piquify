"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function signIn(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Email%20y%20contrase%C3%B1a%20son%20obligatorios");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const displayName = field(formData, "displayName");

  if (!email || !password || !displayName) {
    redirect("/signup?error=Rellena%20todos%20los%20campos");
  }

  if (displayName.length > 50) {
    redirect("/signup?error=El%20alias%20debe%20tener%20como%20mucho%2050%20caracteres");
  }

  if (password.length < 6) {
    redirect("/signup?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%206%20caracteres");
  }

  const origin =
    (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { display_name: displayName },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect(
      "/login?error=Revisa%20el%20correo%20para%20confirmar%20la%20cuenta",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
