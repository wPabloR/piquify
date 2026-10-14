import Link from "next/link";
import { ArrowRight, Flame, Plus, Target, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { ActivityList } from "@/components/activity-list";
import { Avatar } from "@/components/avatar";
import { PlaygroundRow } from "@/components/playground-row";
import { getViewer, listActivity, listFeaturedPiques, listPlaygrounds } from "@/infrastructure/queries";

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const [playgrounds, activity] = await Promise.all([
    listPlaygrounds(viewer.id),
    listActivity(),
  ]);
  const [featured, ...rest] = playgrounds;
  const featuredPiques = featured ? await listFeaturedPiques(featured.id, viewer.id) : [];
  const openPiques = playgrounds.reduce((total, playground) => total + playground.openPiques, 0);
  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(new Date());

  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-marea">
            {today}
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo sm:text-4xl">
            Hola, {viewer.name.split(" ")[0]} 🐚
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {openPiques === 0
              ? "Todavía no tienes piques abiertos."
              : openPiques === 1
                ? "Tienes 1 pique abierto esperando tu jugada."
                : `Tienes ${openPiques} piques abiertos esperando tu jugada.`}
          </p>
        </div>
        <Link
          href="/playgrounds/new"
          className="flex items-center gap-2 rounded-xl bg-marea px-4 py-2.5 text-sm font-semibold text-crema transition-colors hover:bg-abismo"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nuevo playground
        </Link>
      </div>

      {featured ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <section aria-labelledby="destacado" className="relative overflow-hidden rounded-3xl bg-abismo p-6 text-crema shadow-lift sm:p-8">
              <div className="relative flex flex-wrap items-start gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-crema/10 text-3xl" aria-hidden>
                  {featured.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-laguna">Más movimiento ahora</p>
                  <h2 id="destacado" className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {featured.name}
                  </h2>
                  <p className="mt-1 text-sm text-espuma/70">{featured.tagline}</p>
                </div>
                <Link href={`/playgrounds/${featured.id}`} className="flex items-center gap-2 rounded-xl bg-crema px-4 py-2.5 text-sm font-semibold text-abismo hover:bg-espuma">
                  Entrar
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                {featuredPiques.length === 0 ? (
                  <p className="text-sm text-espuma/70">Este playground todavía no tiene piques abiertos.</p>
                ) : (
                  featuredPiques.map((pique) => (
                    <Link key={pique.id} href={`/playgrounds/${featured.id}`} className="rounded-2xl border border-crema/10 bg-crema/[0.06] p-4 hover:border-laguna/60">
                      <p className="line-clamp-2 font-display text-base font-semibold leading-snug">{pique.question}</p>
                      <p className="mt-2 text-xs text-espuma/70">
                        {pique.closesLabel} · {pique.myOptionId ? "Ya has jugado" : "Sin jugar"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
              <div className="relative mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-crema/10 pt-5 text-sm">
                <span className="flex -space-x-2">
                  {featured.members.slice(0, 5).map((member) => (
                    <Avatar key={member.id} name={member.name} size="sm" />
                  ))}
                </span>
                <span className="text-espuma/70">{featured.memberCount} jugadores</span>
                <span className="text-espuma/70">
                  Vas <strong className="font-display text-crema">{featured.myRank}º</strong>
                </span>
                <span className="ml-auto font-display text-lg font-bold tabular-nums text-arena">
                  {featured.pot.toLocaleString("es-ES")} pts en juego
                </span>
              </div>
            </section>

            {rest.length > 0 && (
              <section aria-labelledby="mis-playgrounds" className="mt-8">
                <h2 id="mis-playgrounds" className="mb-3 font-display text-lg font-bold text-abismo">
                  Tus otros playgrounds
                </h2>
                <div className="flex flex-col gap-2.5">
                  {rest.map((playground) => (
                    <PlaygroundRow key={playground.id} playground={playground} />
                  ))}
                </div>
              </section>
            )}
          </div>
          <Season viewerPoints={viewer.points} streak={viewer.streak} accuracy={viewer.accuracy} activity={activity} />
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-abismo/20 bg-white/70 px-6 py-16 text-center">
          <h2 className="font-display text-2xl font-extrabold text-abismo">Crea el primer playground</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-tinta-suave">
            Invita a tu gente, publica un pique y el bote se queda registrado aquí.
          </p>
          <Link href="/playgrounds/new" className="mt-5 inline-flex rounded-xl bg-marea px-4 py-2.5 text-sm font-semibold text-crema">
            Empezar
          </Link>
        </section>
      )}
    </main>
  );
}

function Season({
  viewerPoints,
  streak,
  accuracy,
  activity,
}: {
  viewerPoints: number;
  streak: number;
  accuracy: number;
  activity: { id: string; who: string; body: string; when: string; href: string | null }[];
}) {
  return (
    <aside className="flex flex-col gap-5">
      <section id="ranking" aria-labelledby="tu-temporada" className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <h2 id="tu-temporada" className="font-display text-base font-bold text-abismo">Tu temporada</h2>
        <p className="mt-3 font-display text-4xl font-extrabold tabular-nums text-marea">
          {viewerPoints.toLocaleString("es-ES")}
          <span className="ml-1 text-base font-bold text-tinta-suave">pts</span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-crema px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs text-tinta-suave">
              <Flame className="h-3.5 w-3.5 text-coral" aria-hidden />
              Racha
            </dt>
            <dd className="mt-0.5 font-display font-bold text-abismo">{streak} aciertos</dd>
          </div>
          <div className="rounded-xl bg-crema px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs text-tinta-suave">
              <Target className="h-3.5 w-3.5 text-palma" aria-hidden />
              Precisión
            </dt>
            <dd className="mt-0.5 font-display font-bold text-abismo">{accuracy}%</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-center gap-2 text-xs text-tinta-suave">
          <Trophy className="h-4 w-4 text-madera" aria-hidden />
          El marcador de cada playground solo cuenta sus puntos.
        </p>
      </section>
      <section aria-labelledby="actividad" className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <h2 id="actividad" className="font-display text-base font-bold text-abismo">Actividad</h2>
        <ActivityList items={activity} empty="Cuando pase algo en tus grupos, aparecerá aquí." />
      </section>
    </aside>
  );
}
