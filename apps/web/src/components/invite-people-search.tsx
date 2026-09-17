"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  inviteUserAction,
  searchPeopleAction,
} from "@/app/playgrounds/actions";
import { formatPublicCode } from "@/lib/format";
import type { ProfileSearchHit } from "@/lib/api";
import { fieldClassName, primaryButtonClassName } from "@/lib/ui";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 200;

export function InvitePeopleSearch({ playgroundId }: { playgroundId: string }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<ProfileSearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [, startInvite] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.replace(/^#/, "").length < MIN_QUERY_LENGTH) {
      requestId.current += 1;
      setPeople(null);
      setError(null);
      setSearching(false);
      return;
    }

    const id = ++requestId.current;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void searchPeopleAction(playgroundId, trimmed).then((result) => {
        if (id !== requestId.current) {
          return;
        }
        setSearching(false);
        if ("error" in result) {
          setPeople(null);
          setError(result.error);
          return;
        }
        setError(null);
        setPeople(result);
      });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playgroundId, query]);

  function invite(userId: string) {
    setInvitingId(userId);
    startInvite(async () => {
      const result = await inviteUserAction(playgroundId, userId);
      setInvitingId(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPeople(
        (current) =>
          current?.map((person) =>
            person.id === userId ? { ...person, invitePending: true } : person,
          ) ?? null,
      );
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
        Buscar amigos
      </p>
      <label className="relative">
        <span className="sr-only">Buscar amigos</span>
        <input
          className={`${fieldClassName} pr-10`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre o #4585"
          autoComplete="off"
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
      {!searching && people && people.length === 0 ? (
        <p className="text-sm text-zinc-500">Nadie coincide con esa búsqueda.</p>
      ) : null}
      {people && people.length > 0 ? (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                  {person.displayName}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatPublicCode(person.publicCode)}
                </p>
              </div>
              {person.alreadyMember ? (
                <span className="text-sm text-zinc-500">Ya es miembro</span>
              ) : person.invitePending ? (
                <span className="text-sm text-zinc-500">Pendiente</span>
              ) : (
                <button
                  className={primaryButtonClassName}
                  type="button"
                  disabled={invitingId === person.id}
                  onClick={() => invite(person.id)}
                >
                  Invitar
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
