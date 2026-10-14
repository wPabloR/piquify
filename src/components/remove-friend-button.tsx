"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function RemoveFriendButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="rounded-xl px-3 py-2 text-sm font-medium text-coral hover:bg-coral/10 disabled:opacity-60"
        onClick={() => {
          setPending(true);
          setError(undefined);
          void apiRequest(`/friends/${userId}`, { method: "DELETE" }).then((result) => {
            setPending(false);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Quitando…" : "Eliminar"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-coral">
          {error}
        </p>
      )}
    </div>
  );
}
