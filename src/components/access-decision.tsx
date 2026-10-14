"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function AccessDecision({
  kind,
  id,
}: {
  kind: "invitation" | "request" | "friend";
  id: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const path =
    kind === "invitation"
      ? `/invitations/${id}/response`
      : kind === "friend"
        ? `/friend-requests/${id}/response`
        : `/join-requests/${id}/response`;

  function decide(accept: boolean) {
    setPending(true);
    setError(undefined);
    void apiRequest(path, {
      method: "POST",
      body: JSON.stringify({ accept }),
    }).then((result) => {
      setPending(false);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => decide(true)}
        className="rounded-xl bg-palma px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Aceptar
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => decide(false)}
        className="rounded-xl bg-coral px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Rechazar
      </button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
