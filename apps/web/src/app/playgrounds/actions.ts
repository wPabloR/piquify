"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPlaygroundRequest, inviteUserRequest, searchPeople } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createPlayground(formData: FormData) {
  const name = field(formData, "name");

  if (!name) {
    redirect("/playgrounds/new?error=El%20nombre%20es%20obligatorio");
  }

  if (name.length > 80) {
    redirect(
      "/playgrounds/new?error=El%20nombre%20debe%20tener%20como%20mucho%2080%20caracteres",
    );
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const playground = await createPlaygroundRequest(accessToken, name);
  if ("error" in playground) {
    redirect(`/playgrounds/new?error=${encodeURIComponent(playground.error)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/playgrounds/${playground.id}`);
}

export async function searchPeopleAction(playgroundId: string, query: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { error: "Inicia sesión para buscar" };
  }

  return searchPeople(accessToken, playgroundId, query);
}

export async function inviteUserAction(playgroundId: string, userId: string) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { error: "Inicia sesión para invitar" };
  }

  const result = await inviteUserRequest(accessToken, playgroundId, userId);
  if ("error" in result) {
    return result;
  }

  revalidatePath("/", "layout");
  return { ok: true as const };
}
