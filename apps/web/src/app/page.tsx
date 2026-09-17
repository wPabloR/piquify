import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { fetchMe } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    return (
      <HomeShell>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          El playground es el espacio; las apuestas son opt-in.
        </p>
        <div className="flex gap-4 text-sm">
          <Link className="underline" href="/login">
            Entrar
          </Link>
          <Link className="underline" href="/signup">
            Crear cuenta
          </Link>
        </div>
      </HomeShell>
    );
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return (
      <HomeShell>
        <p className="text-sm text-red-600 dark:text-red-400">
          Hay sesión, pero falta el token. Vuelve a entrar.
        </p>
        <Link className="text-sm underline" href="/login">
          Entrar
        </Link>
      </HomeShell>
    );
  }

  const me = await fetchMe(accessToken);

  if ("error" in me) {
    return (
      <HomeShell>
        <p className="text-sm text-red-600 dark:text-red-400">{me.error}</p>
        <form action={signOut}>
          <button className="text-sm underline" type="submit">
            Salir
          </button>
        </form>
      </HomeShell>
    );
  }

  return (
    <HomeShell>
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Hola, {me.displayName}.
      </p>
      <form action={signOut}>
        <button
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
          type="submit"
        >
          Salir
        </button>
      </form>
    </HomeShell>
  );
}

function HomeShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-4">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Piquify</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Porras entre amigos
        </h1>
        {children}
      </main>
    </div>
  );
}
