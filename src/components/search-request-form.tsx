"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function SearchRequestForm({ playgroundId }: { playgroundId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(undefined);
        setMessage(undefined);
        void apiRequest(`/playgrounds/${playgroundId}/join-requests`, { method: "POST" }).then(
          (result) => {
            setPending(false);
            if (!result.ok) setError(result.error);
            else {
              setMessage("Solicitud enviada al admin.");
              router.refresh();
            }
          },
        );
      }}
    >
      {error && (
        <p role="alert" className="mb-2 text-sm font-medium text-coral">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-2 text-sm font-medium text-palma">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-marea px-3 py-2 text-sm font-semibold text-crema disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Solicitar acceso"}
      </button>
    </form>
  );
}
