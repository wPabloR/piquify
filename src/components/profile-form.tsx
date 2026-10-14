"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

export function ProfileForm({ name }: { name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-6 flex flex-col gap-4 rounded-2xl border border-abismo/10 bg-white p-6 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        const nextName = String(new FormData(event.currentTarget).get("name") ?? "");
        setPending(true);
        setError(undefined);
        setMessage(undefined);
        void apiRequest("/me", {
          method: "PATCH",
          body: JSON.stringify({ name: nextName }),
        }).then((result) => {
          setPending(false);
          if (!result.ok) setError(result.error);
          else {
            setMessage("Nombre actualizado.");
            router.refresh();
          }
        });
      }}
    >
      <label className="text-sm font-semibold text-abismo">
        Nombre visible
        <input
          name="name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={name}
          className="mt-1.5 h-11 w-full rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm font-normal outline-none focus:border-laguna"
        />
      </label>
      {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}
      {message && <p role="status" className="text-sm font-medium text-palma">{message}</p>}
      <button type="submit" disabled={pending} className="rounded-xl bg-marea px-4 py-3 text-sm font-semibold text-crema disabled:opacity-60">
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
