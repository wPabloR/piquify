import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { getHeadToHead, getViewer } from "@/infrastructure/queries";

export default async function HeadToHeadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { userId } = await params;
  const data = await getHeadToHead(viewer.id, userId);
  if (!data) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-8">
      <Link href="/profile" className="text-sm font-medium text-tinta-suave hover:text-marea">
        Volver al perfil
      </Link>
      <header className="mt-4 flex items-center gap-3">
        <Avatar name={data.friend.name} />
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">
            Cara a cara
          </h1>
          <p className="text-sm text-tinta-suave">
            Tú vs @{data.friend.handle}
          </p>
        </div>
      </header>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Tus victorias" value={String(data.myWins)} />
        <Card label={`Victorias de ${data.friend.name}`} value={String(data.theirWins)} />
        <Card label="Tu neto" value={`${data.myNet} pts`} />
        <Card label="Su neto" value={`${data.theirNet} pts`} />
      </dl>
      <section className="mt-8">
        <h2 className="font-display text-base font-bold text-abismo">Playgrounds compartidos</h2>
        {data.sharedPlaygrounds.length === 0 ? (
          <p className="mt-2 text-sm text-tinta-suave">No compartís ningún playground.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.sharedPlaygrounds.map((item) => (
              <li key={item.id}>
                <Link href={`/playgrounds/${item.id}`} className="text-sm font-medium text-marea">
                  {item.emoji} {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-8">
        <h2 className="font-display text-base font-bold text-abismo">Piques juntos</h2>
        {data.piques.length === 0 ? (
          <p className="mt-2 text-sm text-tinta-suave">Aún no habéis coincidido en un pique resuelto.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.piques.map((item) => (
              <li key={item.id} className="rounded-xl border border-abismo/10 bg-white px-4 py-3">
                <Link
                  href={`/playgrounds/${item.playgroundId}#pique-${item.id}`}
                  className="text-sm font-medium text-abismo"
                >
                  {item.question}
                </Link>
                <p className="mt-1 text-xs text-tinta-suave">
                  {item.playgroundName}
                  {item.myWin && item.theirWin
                    ? " · Empate"
                    : item.myWin
                      ? " · Ganaste"
                      : item.theirWin
                        ? ` · Ganó ${data.friend.name}`
                        : " · Sin premio"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-abismo/10 bg-white p-4 shadow-card">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="font-display text-lg font-bold text-abismo">{value}</dd>
    </div>
  );
}
