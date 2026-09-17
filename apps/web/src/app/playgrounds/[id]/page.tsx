import Link from "next/link";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { InvitePeopleSearch } from "@/components/invite-people-search";
import { fetchPlayground } from "@/lib/api";
import { formatDate, roleLabel } from "@/lib/format";
import { getCurrentUser, requireAccessToken } from "@/lib/session";

type PlaygroundPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlaygroundPage({ params }: PlaygroundPageProps) {
  const { id } = await params;
  const accessToken = await requireAccessToken();
  const [user, playground] = await Promise.all([
    getCurrentUser(),
    fetchPlayground(accessToken, id),
  ]);

  if ("error" in playground) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href="/"
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Playground
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400">
          {playground.error}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href="/"
        >
          Volver
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {playground.name}
          </h1>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {roleLabel(playground.role)}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Creado el {formatDate(playground.createdAt)}
        </p>
      </div>

      {playground.role === "admin" ? (
        <section className="flex flex-col gap-4">
          <InvitePeopleSearch playgroundId={id} />
          {playground.inviteToken ? (
            <CopyInviteLink token={playground.inviteToken} />
          ) : null}
        </section>
      ) : playground.inviteToken ? (
        <CopyInviteLink token={playground.inviteToken} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Miembros
        </h2>
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
          {playground.members.map((member) => {
            const isYou = user?.id === member.userId;
            return (
              <li
                key={member.userId}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                    {member.displayName}
                    {isYou ? (
                      <span className="ml-2 text-sm font-normal text-zinc-500">
                        tú
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Desde el {formatDate(member.joinedAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
                  {roleLabel(member.role)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
