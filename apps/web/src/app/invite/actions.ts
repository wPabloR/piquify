"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { acceptInviteRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function joinPlayground(formData: FormData) {
  const token = field(formData, "token");
  if (!token) {
    redirect("/login");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const joined = await acceptInviteRequest(accessToken, token);
  if ("error" in joined) {
    redirect(`/invite/${token}?error=${encodeURIComponent(joined.error)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/playgrounds/${joined.playgroundId}`);
}
