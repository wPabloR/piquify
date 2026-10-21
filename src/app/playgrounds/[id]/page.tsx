import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown, Flame, Plus, Users } from "lucide-react";
import { ActivityList } from "@/components/activity-list";
import { InviteForm } from "@/components/invite-form";
import { Avatar } from "@/components/avatar";
import { PiqueGrid } from "@/components/pique-grid";
import { InviteFriendButton } from "@/components/invite-friend-button";
import {
  getViewer,
  listInvitableFriends,
  listPiques,
  listPlaygroundHistory,
  listPlaygrounds,
} from "@/infrastructure/queries";

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { id } = await params;
  const playgrounds = await listPlaygrounds(viewer.id);
  const playground = playgrounds.find((item) => item.id === id);
  if (!playground) notFound();
  const [piques, history, invitable] = await Promise.all([
    listPiques(playground.id, viewer.id),
    listPlaygroundHistory(playground.id),
    playground.isAdmin ? listInvitableFriends(viewer.id, playground.id) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-6 sm:px-5">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-tinta-suave transition-colors hover:text-marea"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Mis playgrounds
      </Link>

      <header className="flex flex-wrap items-start gap-4 border-b border-abismo/10 pb-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-arena/60 text-3xl" aria-hidden>
          {playground.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-2xl font-extrabold tracking-tight text-abismo sm:text-3xl">{playground.name}</h1>
          <p className="mt-1 text-sm text-tinta-suave">{playground.tagline}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tinta-suave">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden />
              {playground.memberCount} {playground.memberCount === 1 ? "jugador" : "jugadores"}
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-coral" aria-hidden />
              {playground.openPiques} {playground.openPiques === 1 ? "pique abierto" : "piques abiertos"}
            </span>
            <span className="font-medium text-abismo">
              {playground.pot.toLocaleString("es-ES")} pts en juego
            </span>
          </div>
        </div>
        {playground.isAdmin && (
          <Link
            href={`/playgrounds/${playground.id}/new`}
            className="flex items-center gap-2 rounded-xl bg-marea px-4 py-2.5 text-sm font-semibold text-crema transition-colors hover:bg-abismo"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear pique
          </Link>
        )}
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PiqueGrid piques={piques} playgroundId={playground.id} canCreate={playground.isAdmin} />
        <aside className="flex flex-col gap-5">
          <section aria-labelledby="clasificacion" className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
            <h2 id="clasificacion" className="flex items-center gap-2 font-display text-base font-bold text-abismo">
              <Crown className="h-4 w-4 text-madera" aria-hidden />
              Clasificación
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {playground.members.map((member, index) => (
                <li key={member.id} className="flex items-center gap-3">
                  <span className={`w-5 text-center font-display text-sm font-bold tabular-nums ${index === 0 ? "text-madera" : "text-tinta-suave"}`}>
                    {index + 1}
                  </span>
                  <Avatar name={member.name} size="sm" />
                  <span className={`min-w-0 flex-1 truncate text-sm ${member.id === viewer.id ? "font-semibold text-abismo" : "text-tinta"}`}>
                    {member.id === viewer.id ? "Tú" : member.name}
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums text-abismo">{member.points}</span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="historial" className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
            <h2 id="historial" className="font-display text-base font-bold text-abismo">Historial</h2>
            <ActivityList items={history} empty="Todavía no hay movimientos en este playground." />
          </section>
          {playground.isAdmin && (
            <section aria-labelledby="invitar" className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
              <h2 id="invitar" className="font-display text-base font-bold text-abismo">Invitar</h2>
              <p className="mt-1 text-xs text-tinta-suave">
                Código del grupo: <span className="font-mono font-semibold text-abismo">{playground.publicCode}</span>
              </p>
              {invitable.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {invitable.map((friend) => (
                    <li key={friend.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-abismo">{friend.name}</span>
                      <InviteFriendButton playgroundId={playground.id} userId={friend.id} />
                    </li>
                  ))}
                </ul>
              )}
              <InviteForm playgroundId={playground.id} />
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
