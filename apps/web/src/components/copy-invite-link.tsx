"use client";

import { useState } from "react";
import { secondaryButtonClassName } from "@/lib/ui";

export function CopyInviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/invite/${token}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
          Invitar
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Comparte este enlace. Quien lo abra puede unirse al playground.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          readOnly
          value={path}
        />
        <button className={secondaryButtonClassName} type="button" onClick={copy}>
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
}
