import Link from "next/link";
import { joinPlayground } from "@/app/invite/actions";
import { fetchInvite } from "@/lib/api";
import { requireAccessToken } from "@/lib/session";
import { primaryButtonClassName } from "@/lib/ui";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Invitación · Piquify",
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;
  const accessToken = await requireAccessToken(`/invite/${token}`);
  const [invite, query] = await Promise.all([
    fetchInvite(accessToken, token),
    searchParams,
  ]);
  const error = Array.isArray(query.error) ? query.error[0] : query.error;

  if ("error" in invite) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Invitación
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400">{invite.error}</p>
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href="/"
        >
          Ir al inicio
        </Link>
      </main>
    );
  }

  if (invite.alreadyMember) {
    redirect(`/playgrounds/${invite.playgroundId}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-zinc-500">
          Invitación
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {invite.name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Te han invitado a este playground. Únete para ver a los miembros y los
          piques.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <form action={joinPlayground}>
        <input type="hidden" name="token" value={token} />
        <button className={primaryButtonClassName} type="submit">
          Unirme
        </button>
      </form>
    </main>
  );
}
