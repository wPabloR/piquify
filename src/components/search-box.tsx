"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { apiRequest } from "@/lib/api";
import type { SearchPersonView, SearchPlaygroundView } from "@/domain/views";

type Hit =
  | { kind: "playground"; item: SearchPlaygroundView }
  | { kind: "person"; item: SearchPersonView };

export function SearchBox({
  defaultQuery = "",
  className = "relative ml-auto min-w-0 flex-1 max-w-64",
  placeholder = "Buscar playgrounds y personas",
}: {
  defaultQuery?: string;
  className?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "empty">("idle");
  const needle = query.trim();
  const tooShort = needle.length < 2;
  const displayHits = tooShort ? [] : hits;
  const displayStatus = tooShort ? "idle" : status;

  useEffect(() => {
    if (tooShort) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      void apiRequest<{ playgrounds: SearchPlaygroundView[]; people: SearchPersonView[] }>(
        `/search?q=${encodeURIComponent(needle)}`,
        { method: "GET", signal: controller.signal },
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          if (!result.ok) {
            setHits([]);
            setStatus("empty");
            return;
          }
          const next: Hit[] = [
            ...result.data.playgrounds.slice(0, 6).map((item) => ({ kind: "playground" as const, item })),
            ...result.data.people.slice(0, 6).map((item) => ({ kind: "person" as const, item })),
          ];
          setHits(next);
          setActive(0);
          setStatus(next.length === 0 ? "empty" : "idle");
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setHits([]);
            setStatus("empty");
          }
        });
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [needle, tooShort]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showList = open && !tooShort;

  function hrefFor(hit: Hit) {
    if (hit.kind === "playground") {
      return hit.item.access === "member"
        ? `/playgrounds/${hit.item.id}`
        : `/search?q=${encodeURIComponent(query.trim())}`;
    }
    return hit.item.relation === "friend"
      ? `/profile/friends/${hit.item.id}`
      : `/search?q=${encodeURIComponent(query.trim())}`;
  }

  function go(hit: Hit) {
    setOpen(false);
    router.push(hrefFor(hit));
  }

  return (
    <form
      ref={rootRef}
      action="/search"
      className={className}
      onSubmit={() => setOpen(false)}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-suave"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={query}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && displayHits[active] ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        aria-label="Buscar playgrounds y personas"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (!showList || displayHits.length === 0) {
            if (event.key === "Escape") setOpen(false);
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % displayHits.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + displayHits.length) % displayHits.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const hit = displayHits[active];
            if (hit) go(hit);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-10 w-full rounded-xl border border-abismo/10 bg-white pl-9 pr-3 text-sm text-tinta outline-none placeholder:text-tinta-suave/70 focus:border-laguna focus:ring-2 focus:ring-laguna/30"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados"
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-80 min-w-full overflow-auto rounded-xl border border-abismo/10 bg-white py-1 shadow-card sm:min-w-[22rem]"
        >
          {displayStatus === "loading" && displayHits.length === 0 && (
            <li className="px-3 py-2 text-sm text-tinta-suave">Buscando…</li>
          )}
          {displayStatus === "empty" && (
            <li className="px-3 py-2 text-sm text-tinta-suave">Sin coincidencias</li>
          )}
          {displayHits.map((hit, index) => (
            <li key={`${hit.kind}-${hit.item.id}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
              <Link
                href={hrefFor(hit)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm ${
                  index === active ? "bg-espuma" : "hover:bg-crema"
                }`}
                onMouseEnter={() => setActive(index)}
                onClick={() => setOpen(false)}
              >
                {hit.kind === "playground" ? (
                  <>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-arena/60 text-base" aria-hidden>
                      {hit.item.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-abismo">{hit.item.name}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-marea">
                        Playground
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <Avatar name={hit.item.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-abismo">
                        {hit.item.name}{" "}
                        <span className="font-normal text-tinta-suave">@{hit.item.handle}</span>
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-madera">
                        Persona
                      </span>
                    </span>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
