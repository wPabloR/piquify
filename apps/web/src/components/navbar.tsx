import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { primaryButtonClassName } from "@/lib/ui";
import type { MeResponse } from "@/lib/api";

type NavbarProps = {
  user: MeResponse | null;
  signedIn: boolean;
};

export function Navbar({ user, signedIn }: NavbarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
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
                className={primaryButtonClassName}
                href="/playgrounds/new"
              >
                Nuevo playground
              </Link>
              {user ? (
                <span className="hidden text-zinc-600 sm:inline dark:text-zinc-400">
                  {user.displayName}
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
