"use client";

import { useState } from "react";

export function FriendCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link">();
  const shareUrl =
    typeof window === "undefined" ? `/add/${code}` : `${window.location.origin}/add/${code}`;

  async function copy(kind: "code" | "link", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <section className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-abismo">Tu código</h2>
      <p className="mt-1 text-sm text-tinta-suave">
        Compártelo para que te agreguen como amigo.
      </p>
      <p className="mt-3 font-mono text-2xl font-bold tracking-[0.2em] text-abismo">{code}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy("code", code)}
          className="rounded-xl bg-abismo px-3 py-2 text-sm font-semibold text-crema"
        >
          {copied === "code" ? "Copiado" : "Copiar código"}
        </button>
        <button
          type="button"
          onClick={() => void copy("link", shareUrl)}
          className="rounded-xl border border-abismo/15 px-3 py-2 text-sm font-semibold text-abismo"
        >
          {copied === "link" ? "Enlace copiado" : "Copiar enlace"}
        </button>
      </div>
    </section>
  );
}
