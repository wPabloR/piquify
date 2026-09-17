import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/notification-bell";
import { formatPublicCode } from "@/lib/format";
import { primaryButtonClassName } from "@/lib/ui";
import type { MeResponse } from "@/lib/api";

type NavbarProps = {
  user: MeResponse | null;
  signedIn: boolean;
  notificationCount: number;
};

export function Navbar({ user, signedIn, notificationCount }: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-4 px-6 py-2">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          Piquify
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {signedIn ? (
            <>
              <Link
                href="/notifications"
                aria-label={
                  notificationCount > 0
                    ? `Notificaciones, ${notificationCount} pendientes`
                    : "Notificaciones"
                }
                className="relative inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                <NotificationBell count={notificationCount} />
                <span className="hidden sm:inline">Notificaciones</span>
              </Link>
              <Link
                href="/playgrounds/join"
                className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Unirse
              </Link>
              <Link className={primaryButtonClassName} href="/playgrounds/new">
                Nuevo playground
              </Link>
              {user ? (
                <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">
                  {user.displayName}{" "}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {formatPublicCode(user.publicCode)}
                  </span>
                </span>
              ) : null}
              <form action={signOut}>
                <button
                  className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                  type="submit"
                >
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
                href="/login"
              >
                Entrar
              </Link>
              <Link className={primaryButtonClassName} href="/signup">
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
