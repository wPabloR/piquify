import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendCodeCard } from "@/components/friend-code-card";
import { FriendRequestForm } from "@/components/friend-request-form";
import { ProfileForm } from "@/components/profile-form";
import { RemoveFriendButton } from "@/components/remove-friend-button";
import { LedgerList } from "@/components/ledger-list";
import { getProfileStats, getViewer, listFriends, listLedgerMovements } from "@/infrastructure/queries";

export default async function ProfilePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const [stats, friends, movements] = await Promise.all([
    getProfileStats(viewer.id),
    listFriends(viewer.id),
    listLedgerMovements(viewer.id),
  ]);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-5 px-4 pb-20 pt-8 sm:px-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">Tu perfil</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Usuario @{viewer.handle}. Los puntos no son dinero.
        </p>
      </div>
      <FriendCodeCard code={viewer.friendCode} />
      <section className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-abismo">Estadísticas</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Piques jugados" value={String(stats.played)} />
          <Stat label="Ganados" value={String(stats.won)} />
          <Stat label="Acierto" value={`${stats.accuracy}%`} />
          <Stat label="Racha" value={String(stats.streak)} />
          <Stat label="Balance neto" value={`${stats.net} pts`} />
        </dl>
      </section>
      <section className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-abismo">Movimientos</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          El saldo sale de estos apuntes. No se editan ni se borran.
        </p>
        <LedgerList items={movements} />
      </section>
      <section className="rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <h2 className="font-display text-base font-bold text-abismo">Amigos</h2>
        <div className="mt-3">
          <FriendRequestForm />
        </div>
        {friends.length === 0 ? (
          <p className="mt-4 text-sm text-tinta-suave">Todavía no tienes amigos.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {friends.map((friend) => (
              <li key={friend.id} className="flex items-center justify-between gap-2">
                <Link href={`/profile/friends/${friend.id}`} className="min-w-0">
                  <p className="truncate text-sm font-medium text-abismo">{friend.name}</p>
                  <p className="text-xs text-tinta-suave">@{friend.handle}</p>
                </Link>
                <RemoveFriendButton userId={friend.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <ProfileForm name={viewer.name} />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-crema/70 px-3 py-2">
      <dt className="text-xs text-tinta-suave">{label}</dt>
      <dd className="font-display text-lg font-bold text-abismo">{value}</dd>
    </div>
  );
}
