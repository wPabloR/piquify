import Link from "next/link";
import { fetchPlaygrounds } from "@/lib/api";
import { formatDate, roleLabel } from "@/lib/format";
import { getAccessToken, getCurrentUser } from "@/lib/session";
import { primaryButtonClassName, secondaryButtonClassName } from "@/lib/ui";

export default async function Home() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Porras entre amigos
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          El playground es el espacio; las apuestas son opt-in.
        </p>
        <div className="flex gap-3">
          <Link className={primaryButtonClassName} href="/login">
            Entrar
          </Link>
          <Link className={secondaryButtonClassName} href="/signup">
            Crear cuenta
          </Link>
        </div>
      </main>
    );
  }

  const [user, playgrounds] = await Promise.all([
    getCurrentUser(),
    fetchPlaygrounds(accessToken),
  ]);

  if ("error" in playgrounds) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Tus playgrounds
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400">
          {playgrounds.error}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Tus playgrounds
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {user
              ? `Hola, ${user.displayName}. Aquí están tus grupos.`
              : "Aquí están tus grupos."}
          </p>
        </div>
        <Link className={primaryButtonClassName} href="/playgrounds/new">
          Nuevo playground
        </Link>
      </div>

      {playgrounds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Aún no tienes playgrounds. Crea el primero e invita a tus amigos.
          </p>
          <Link
            className={`${primaryButtonClassName} mt-4`}
            href="/playgrounds/new"
          >
            Crear playground
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {playgrounds.map((playground) => (
            <li key={playground.id}>
              <Link
                href={`/playgrounds/${playground.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">
                    {playground.name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Creado el {formatDate(playground.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {roleLabel(playground.role)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
