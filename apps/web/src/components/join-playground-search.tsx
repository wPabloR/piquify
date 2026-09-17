"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  requestAccessAction,
  searchPlaygroundsAction,
} from "@/app/playgrounds/actions";
import { formatPublicCode } from "@/lib/format";
import type { PlaygroundSearchHit } from "@/lib/api";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/lib/ui";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 200;

export function JoinPlaygroundSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlaygroundSearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [, startRequest] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.replace(/^#/, "").length < MIN_QUERY_LENGTH) {
      requestId.current += 1;
      setHits(null);
      setError(null);
      setSearching(false);
      return;
    }

    const id = ++requestId.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchPlaygroundsAction(trimmed).then((result) => {
        if (id !== requestId.current) {
          return;
        }
        setSearching(false);
        if ("error" in result) {
          setHits(null);
          setError(result.error);
          return;
        }
        setError(null);
        setHits(result);
      });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  function requestAccess(playgroundId: string) {
    setRequestingId(playgroundId);
    startRequest(async () => {
      const result = await requestAccessAction(playgroundId);
      setRequestingId(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setHits(
        (current) =>
          current?.map((hit) =>
            hit.id === playgroundId ? { ...hit, requestPending: true } : hit,
          ) ?? null,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="relative">
        <span className="sr-only">Buscar playground</span>
        <input
          className={`${fieldClassName} pr-10`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o #1000"
          autoComplete="off"
          autoFocus
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
        </span>
      </label>
      {query.trim().replace(/^#/, "").length > 0 &&
      query.trim().replace(/^#/, "").length < MIN_QUERY_LENGTH ? (
        <p className="text-sm text-zinc-500">Escribe al menos 3 caracteres.</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {searching ? (
        <p className="text-sm text-zinc-500">Buscando…</p>
      ) : null}
      {!searching && hits && hits.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Ningún playground coincide con esa búsqueda.
        </p>
      ) : null}
      {hits && hits.length > 0 ? (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {hits.map((hit) => (
            <li
              key={hit.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                  {hit.name}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatPublicCode(hit.publicCode)}
                </p>
              </div>
              {hit.alreadyMember ? (
                <Link className={secondaryButtonClassName} href={`/playgrounds/${hit.id}`}>
                  Entrar
                </Link>
              ) : hit.requestPending ? (
                <span className="text-sm text-zinc-500">Pendiente</span>
              ) : (
                <button
                  className={primaryButtonClassName}
                  type="button"
                  disabled={requestingId === hit.id}
                  onClick={() => requestAccess(hit.id)}
                >
                  Solicitar acceso
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
