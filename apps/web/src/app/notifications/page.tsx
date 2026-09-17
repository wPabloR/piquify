import Link from "next/link";
import {
  acceptInvitation,
  declineInvitation,
} from "@/app/invitations/actions";
import {
  acceptJoinRequestAction,
  declineJoinRequestAction,
} from "@/app/playgrounds/actions";
import { formatDate, formatPublicCode } from "@/lib/format";
import { getPendingNotifications, requireAccessToken } from "@/lib/session";
import { primaryButtonClassName, secondaryButtonClassName } from "@/lib/ui";

export const metadata = {
  title: "Notificaciones · Piquify",
};

type NotificationsPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  await requireAccessToken("/notifications");
  const [inbox, params] = await Promise.all([
    getPendingNotifications(),
    searchParams,
  ]);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const empty =
    inbox.invitations.length === 0 && inbox.joinRequests.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href="/"
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Notificaciones
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Invitaciones a playgrounds y solicitudes de acceso.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {empty ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No tienes notificaciones pendientes.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {inbox.invitations.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Invitación a playground
                </h2>
                <p className="text-sm text-zinc-500">
                  Te han invitado a unirte a un grupo.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {inbox.invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-col gap-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-sky-900 dark:bg-sky-950/40"
                  >
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="w-fit rounded-full bg-sky-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                        Invitación a playground
                      </span>
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {invitation.playgroundName}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {invitation.invitedByName}{" "}
                        {formatPublicCode(invitation.invitedByPublicCode)} te
                        invitó el {formatDate(invitation.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={declineInvitation}>
                        <input type="hidden" name="id" value={invitation.id} />
                        <button
                          className={secondaryButtonClassName}
                          type="submit"
                        >
                          Rechazar
                        </button>
                      </form>
                      <form action={acceptInvitation}>
                        <input type="hidden" name="id" value={invitation.id} />
                        <button
                          className={primaryButtonClassName}
                          type="submit"
                        >
                          Aceptar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inbox.joinRequests.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Acceso a playground
                </h2>
                <p className="text-sm text-zinc-500">
                  Alguien quiere entrar a un playground que administras.
                </p>
              </div>
              <ul className="flex flex-col gap-3">
                {inbox.joinRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40"
                  >
                    <div className="flex min-w-0 flex-col gap-2">
                      <span className="w-fit rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                        Acceso a playground
                      </span>
                      <p className="font-medium text-zinc-950 dark:text-zinc-50">
                        {request.playgroundName}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {request.displayName}{" "}
                        {formatPublicCode(request.publicCode)} quiere entrar ·{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={declineJoinRequestAction}>
                        <input
                          type="hidden"
                          name="playgroundId"
                          value={request.playgroundId}
                        />
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <button
                          className={secondaryButtonClassName}
                          type="submit"
                        >
                          Rechazar
                        </button>
                      </form>
                      <form action={acceptJoinRequestAction}>
                        <input
                          type="hidden"
                          name="playgroundId"
                          value={request.playgroundId}
                        />
                        <input
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <button
                          className={primaryButtonClassName}
                          type="submit"
                        >
                          Aceptar
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
