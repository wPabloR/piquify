"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function InviteFriendButton({
  playgroundId,
  userId,
}: {
  playgroundId: string;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="rounded-xl bg-abismo px-3 py-1.5 text-xs font-semibold text-crema disabled:opacity-60"
        onClick={() => {
          setPending(true);
          setError(undefined);
          setMessage(undefined);
          void apiRequest(`/playgrounds/${playgroundId}/invitations`, {
            method: "POST",
            body: JSON.stringify({ userId }),
          }).then((result) => {
            setPending(false);
            if (!result.ok) setError(result.error);
            else {
              setMessage("Invitado");
              router.refresh();
            }
          });
        }}
      >
        {pending ? "…" : message ?? "Invitar"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-coral">
          {error}
        </p>
      )}
    </div>
  );
}