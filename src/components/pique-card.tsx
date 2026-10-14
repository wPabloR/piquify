"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Flame, Lock, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Avatar } from "@/components/avatar";
import type { PiqueView } from "@/domain/views";

export function PiqueCard({
  pique,
  playgroundId,
}: {
  pique: PiqueView;
  playgroundId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const editable = pique.status === "open";

  async function run(path: string, init: RequestInit) {
    setPending(true);
    setError(undefined);
    const result = await apiRequest(path, init);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <article
      id={`pique-${pique.id}`}
      className="flex h-full flex-col rounded-2xl border border-abismo/10 bg-white p-5 shadow-card"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-snug text-abismo">{pique.question}</h3>
          {pique.detail && <p className="mt-1 text-sm text-tinta-suave">{pique.detail}</p>}
        </div>
        <Status pique={pique} />
      </div>

      <ul className="flex flex-col gap-2">
        {pique.options.map((option) => {
          const selected = pique.myOptionId === option.id;
          const winner = pique.winningOptionIds.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={!editable || pending}
                aria-pressed={selected}
                onClick={() =>
                  void run(`/piques/${pique.id}/participation`, {
                    method: "POST",
                    body: JSON.stringify({ optionId: option.id, playgroundId }),
                  })
                }
                className={`relative w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  winner
                    ? "border-palma bg-palma/5"
                    : selected
                      ? "border-marea bg-espuma/60"
                      : "border-abismo/10 bg-crema/60"
                } ${editable ? "hover:border-laguna" : "cursor-default"}`}
              >
                {option.share !== null && (
                  <span
                    className={`absolute inset-y-0 left-0 ${winner ? "bg-palma/15" : selected ? "bg-laguna/15" : "bg-abismo/[0.05]"}`}
                    style={{ width: `${option.share}%` }}
                    aria-hidden
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <span className="flex-1 truncate text-sm font-medium text-abismo">{option.label}</span>
                  {option.share !== null && (
                    <>
                      <span className="flex -space-x-1.5">
                        {option.backers.slice(0, 3).map((backer) => (
                          <Avatar key={backer} name={backer} size="sm" ring />
                        ))}
                      </span>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-tinta-suave">
                        {option.share}%
                      </span>
                    </>
                  )}
                  {(selected || winner) && (
                    <Check className={`h-4 w-4 ${winner ? "text-palma" : "text-marea"}`} aria-hidden />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-tinta-suave">
        {pique.participantCount === 0
          ? "Todavía no hay participantes."
          : pique.participantCount === 1
            ? "1 participante"
            : `${pique.participantCount} participantes`}
        {pique.myOptionId ? " · Ya has jugado" : ""}
      </p>

      {pique.canPropose && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const optionId = String(form.get("optionId") ?? "");
            void run(`/piques/${pique.id}/proposal`, {
              method: "POST",
              body: JSON.stringify({ optionId }),
            });
          }}
        >
          <label className="sr-only" htmlFor={`proposal-${pique.id}`}>
            Opción ganadora
          </label>
          <select
            id={`proposal-${pique.id}`}
            name="optionId"
            defaultValue=""
            className="h-10 flex-1 rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm"
          >
            <option value="" disabled>
              Propón el resultado
            </option>
            {pique.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={pending} className="rounded-xl bg-abismo px-3 text-sm font-semibold text-crema">
            Proponer
          </button>
        </form>
      )}

      {pique.canVote && (
        <form
          className="mt-4 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            const decision = submitter?.value === "reject" ? "reject" : "approve";
            const suggested = String(form.get("suggestion") ?? "");
            void run(`/piques/${pique.id}/votes`, {
              method: "POST",
              body: JSON.stringify({
                decision,
                suggestedOptionId: suggested.length > 0 ? suggested : null,
              }),
            });
          }}
        >
          <p className="text-xs text-tinta-suave">
            Propuesta: <strong className="text-abismo">{pique.proposalLabel}</strong>. El silencio contará a favor.
          </p>
          <select name="suggestion" defaultValue="" aria-label="Opción alternativa si rechazas" className="h-10 rounded-xl border border-abismo/15 bg-crema/50 px-3 text-sm">
            <option value="">Rechazar sin proponer otra</option>
            {pique.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" name="decision" value="approve" disabled={pending} className="flex-1 rounded-xl bg-palma px-3 py-2 text-sm font-semibold text-white">
              A favor
            </button>
            <button type="submit" name="decision" value="reject" disabled={pending} className="flex-1 rounded-xl bg-coral px-3 py-2 text-sm font-semibold text-white">
              Rechazar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-coral">
          {error}
        </p>
      )}

      <footer className="mt-auto flex items-center gap-3 pt-4 text-xs text-tinta-suave">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {pique.closesLabel}
        </span>
        <span aria-hidden>·</span>
        <span>{pique.stake} pts</span>
        <span className="ml-auto truncate">por {pique.createdBy}</span>
      </footer>
      {pique.canLeave && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void run(`/piques/${pique.id}/participation`, { method: "DELETE" })}
          className="mt-3 text-left text-xs font-semibold text-coral hover:underline"
        >
          Salir y recuperar el stake
        </button>
      )}
    </article>
  );
}

function Status({ pique }: { pique: PiqueView }) {
  if (pique.hot && pique.status === "open") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">
        <Flame className="h-3.5 w-3.5" aria-hidden />
        Cierra pronto
      </span>
    );
  }
  if (pique.status === "locked" || pique.status === "pending_result") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-abismo/5 px-2 py-1 text-xs font-semibold text-tinta-suave">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        {pique.status === "pending_result" ? "En votación" : "Cerrado"}
      </span>
    );
  }
  if (pique.status === "resolved") {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-palma/10 px-2 py-1 text-xs font-semibold text-palma">
        <Trophy className="h-3.5 w-3.5" aria-hidden />
        Resuelto
      </span>
    );
  }
  return null;
}
