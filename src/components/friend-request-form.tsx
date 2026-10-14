"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function FriendRequestForm({
  code,
  userId,
  label = "Añadir",
}: {
  code?: string;
  userId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formCode = code ?? String(new FormData(event.currentTarget).get("code") ?? "");
        setPending(true);
        setError(undefined);
        void apiRequest("/friend-requests", {
          method: "POST",
          body: JSON.stringify(userId ? { userId } : { code: formCode }),
        }).then((result) => {
          setPending(false);
          if (!result.ok) setError(result.error);
          else router.refresh();
        });
      }}
    >
      {!code && !userId && (
        <label className="text-sm font-semibold text-abismo">
          Código de amigo
          <input
            name="code"
            required
            minLength={8}
            maxLength={8}
            className="mt-1.5 h-11 w-full rounded-xl border border-abismo/15 bg-crema/50 px-3 font-mono text-sm uppercase outline-none focus:border-laguna"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-coral">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-abismo px-3 py-2 text-sm font-semibold text-crema disabled:opacity-60"
      >
        {pending ? "Enviando…" : label}
      </button>
    </form>
  );
}
