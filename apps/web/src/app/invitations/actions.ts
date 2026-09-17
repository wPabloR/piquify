"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acceptInvitationRequest,
  declineInvitationRequest,
} from "@/lib/api";
import { getAccessToken } from "@/lib/session";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function acceptInvitation(formData: FormData) {
  const id = field(formData, "id");
  if (!id) {
    redirect("/invitations");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const result = await acceptInvitationRequest(accessToken, id);
  if ("error" in result) {
    redirect(`/invitations?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/playgrounds/${result.playgroundId}`);
}

export async function declineInvitation(formData: FormData) {
  const id = field(formData, "id");
  if (!id) {
    redirect("/invitations");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    redirect("/login");
  }

  const result = await declineInvitationRequest(accessToken, id);
  if (result && "error" in result) {
    redirect(`/invitations?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/", "layout");
  redirect("/invitations");
}
