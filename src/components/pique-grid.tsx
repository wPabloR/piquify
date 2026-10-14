"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PiqueCard } from "@/components/pique-card";
import type { PiqueStatus } from "@/domain/models";
import { piqueFilterForHash } from "@/domain/presentation";
import type { PiqueView } from "@/domain/views";

const filters: { id: PiqueStatus | "all"; label: string }[] = [
  { id: "open", label: "Abiertos" },
  { id: "locked", label: "Cerrados" },
  { id: "pending_result", label: "En votación" },
  { id: "resolved", label: "Resueltos" },
  { id: "all", label: "Todos" },
];

export function PiqueGrid({
  piques,
  playgroundId,
  canCreate = false,
}: {
  piques: PiqueView[];
  playgroundId: string;
  canCreate?: boolean;
}) {
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => "",
  );
  const [manualFilter, setManualFilter] = useState<{
    hash: string;
    value: PiqueStatus | "all";
  } | null>(null);
  const filter =
    manualFilter && manualFilter.hash === hash
      ? manualFilter.value
      : piqueFilterForHash(piques, hash);
  const visible = filter === "all" ? piques : piques.filter((pique) => pique.status === filter);

  useEffect(() => {
    const id = hash.replace(/^#/, "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [filter, hash, piques]);

  return (
    <section aria-label="Piques del playground">
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar piques">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setManualFilter({ hash, value: item.id })}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
              filter === item.id ? "bg-abismo text-crema" : "bg-white text-tinta-suave hover:text-abismo"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {visible.map((pique) => (
            <PiqueCard key={pique.id} pique={pique} playgroundId={playgroundId} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-abismo/20 bg-white/60 px-6 py-12 text-center">
          <p className="font-display text-lg font-bold text-abismo">Aquí no hay nada todavía</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-tinta-suave">
            Los piques aparecerán en esta pestaña cuando cambien de estado.
          </p>
          {canCreate && (
            <Link href={`/playgrounds/${playgroundId}/new`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-marea px-4 py-2.5 text-sm font-semibold text-crema">
              <Plus className="h-4 w-4" aria-hidden />
              Crear el primero
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
