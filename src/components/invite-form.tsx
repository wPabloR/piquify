"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function InviteForm({ playgroundId }: { playgroundId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-3 flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const handle = String(new FormData(event.currentTarget).get("handle") ?? "");
        setPending(true);
        setError(undefined);
        setMessage(undefined);
        void apiRequest(`/playgrounds/${playgroundId}/invitations`, {
          method: "POST",
          body: JSON.stringify({ handle }),
        }).then((result) => {
          setPending(false);
          if (!result.ok) setError(result.error);
          else {
            setMessage("Invitación enviada.");
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor="invite-handle" className="text-xs font-semibold text-abismo">
        Usuario
      </label>
      <input
        id="invite-handle"
        name="handle"
        required
        placeholder="nuria"
        className="h-10 rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm outline-none focus:border-laguna"
      />
      {error && (
        <p role="alert" className="text-sm font-medium text-coral">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm font-medium text-palma">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-abismo px-3 py-2 text-sm font-semibold text-crema disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar invitación"}
      </button>
    </form>
  );
}
