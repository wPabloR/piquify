import Link from "next/link";
import {
  acceptInvitation,
  declineInvitation,
} from "@/app/invitations/actions";
import { formatDate, formatPublicCode } from "@/lib/format";
import { getPendingInvitations, requireAccessToken } from "@/lib/session";
import { primaryButtonClassName, secondaryButtonClassName } from "@/lib/ui";

export const metadata = {
  title: "Invitaciones · Piquify",
};

type InvitationsPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function InvitationsPage({
  searchParams,
}: InvitationsPageProps) {
  await requireAccessToken("/invitations");
  const [invitations, params] = await Promise.all([
    getPendingInvitations(),
    searchParams,
  ]);
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

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
          Invitaciones
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Acepta o rechaza las invitaciones a playgrounds.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {invitations.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          No tienes invitaciones pendientes.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-medium text-zinc-950 dark:text-zinc-50">
                  {invitation.playgroundName}
                </p>
                <p className="text-sm text-zinc-500">
                  {invitation.invitedByName}{" "}
                  {formatPublicCode(invitation.invitedByPublicCode)} te invitó el{" "}
                  {formatDate(invitation.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={declineInvitation}>
                  <input type="hidden" name="id" value={invitation.id} />
                  <button className={secondaryButtonClassName} type="submit">
                    Rechazar
                  </button>
                </form>
                <form action={acceptInvitation}>
                  <input type="hidden" name="id" value={invitation.id} />
                  <button className={primaryButtonClassName} type="submit">
                    Aceptar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
