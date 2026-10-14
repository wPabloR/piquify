"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function NewPlaygroundPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto max-w-lg px-5 pb-20 pt-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-tinta-suave hover:text-marea">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Mis playgrounds
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">Nuevo playground</h1>
      <p className="mt-1 text-sm text-tinta-suave">Serás el admin. Solo tú podrás crear piques.</p>
      <form
        className="mt-6 flex flex-col gap-4 rounded-2xl border border-abismo/10 bg-white p-6 shadow-card"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError(undefined);
          void apiRequest<{ id: string }>("/playgrounds", {
            method: "POST",
            body: JSON.stringify({
              name: String(form.get("name") ?? ""),
              tagline: String(form.get("tagline") ?? ""),
            }),
          }).then((result) => {
            setPending(false);
            if (!result.ok) setError(result.error);
            else router.push(`/playgrounds/${result.data.id}`);
          });
        }}
      >
        <label className="text-sm font-semibold text-abismo">
          Nombre
          <input name="name" required className="mt-1.5 h-11 w-full rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm font-normal outline-none focus:border-laguna" />
        </label>
        <label className="text-sm font-semibold text-abismo">
          Descripción
          <input name="tagline" className="mt-1.5 h-11 w-full rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm font-normal outline-none focus:border-laguna" />
        </label>
        {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}
        <button type="submit" disabled={pending} className="rounded-xl bg-marea px-4 py-3 text-sm font-semibold text-crema disabled:opacity-60">
          {pending ? "Creando…" : "Crear playground"}
        </button>
      </form>
    </main>
  );
}
