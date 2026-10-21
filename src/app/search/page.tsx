import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { AccessDecision } from "@/components/access-decision";
import { FriendRequestForm } from "@/components/friend-request-form";
import { SearchBox } from "@/components/search-box";
import { SearchRequestForm } from "@/components/search-request-form";
import { getViewer, searchPeople, searchPlaygrounds } from "@/infrastructure/queries";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const [playgrounds, people] = query
    ? await Promise.all([searchPlaygrounds(query), searchPeople(query)])
    : [[], []];
  const empty = query.length > 0 && playgrounds.length === 0 && people.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">Buscar</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Encuentra playgrounds y personas por nombre, usuario o código.
      </p>
      <SearchBox key={query} defaultQuery={query} className="relative mt-4 w-full" />
      {empty && (
        <p className="mt-6 text-sm text-tinta-suave">No hay resultados para esa búsqueda.</p>
      )}
      {(playgrounds.length > 0 || people.length > 0) && (
        <ul className="mt-6 flex flex-col gap-3">
          {playgrounds.map((playground) => (
            <li key={`pg-${playground.id}`} className="rounded-2xl border border-abismo/10 bg-white p-4 shadow-card">
              <p>
                <span className="inline-flex rounded-md bg-espuma px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-marea">
                  Playground
                </span>
              </p>
              <p className="mt-1.5 font-display text-base font-bold text-abismo">
                {playground.emoji} {playground.name}
              </p>
              {playground.tagline && (
                <p className="mt-1 text-sm text-tinta-suave">{playground.tagline}</p>
              )}
              <div className="mt-3">
                {playground.access === "member" ? (
                  <a
                    href={`/playgrounds/${playground.id}`}
                    className="inline-flex rounded-xl bg-abismo px-3 py-2 text-sm font-semibold text-crema"
                  >
                    Abrir
                  </a>
                ) : playground.access === "pending_request" ? (
                  <p className="text-sm font-medium text-tinta-suave">Solicitud pendiente</p>
                ) : (
                  <SearchRequestForm playgroundId={playground.id} />
                )}
              </div>
            </li>
          ))}
          {people.map((person) => (
            <li
              key={`person-${person.id}`}
              className="flex items-center gap-3 rounded-2xl border border-abismo/10 bg-white p-4 shadow-card"
            >
              <Avatar name={person.name} />
              <div className="min-w-0 flex-1">
                <p>
                  <span className="inline-flex rounded-md bg-arena/70 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-madera">
                    Persona
                  </span>
                </p>
                <p className="mt-1 truncate font-medium text-abismo">{person.name}</p>
                <p className="text-sm text-tinta-suave">@{person.handle}</p>
              </div>
              {person.relation === "friend" ? (
                <a href={`/profile/friends/${person.id}`} className="text-sm font-semibold text-marea">
                  Amigos
                </a>
              ) : person.relation === "outgoing" ? (
                <p className="text-sm font-medium text-tinta-suave">Pendiente</p>
              ) : person.relation === "incoming" && person.incomingRequestId ? (
                <AccessDecision kind="friend" id={person.incomingRequestId} />
              ) : (
                <FriendRequestForm userId={person.id} label="Añadir" />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
