import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import { getAccessToken } from "@/lib/session";
import { fieldClassName, primaryButtonClassName } from "@/lib/ui";

export const metadata = {
  title: "Entrar · Piquify",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const accessToken = await getAccessToken();
  if (accessToken) {
    redirect("/");
  }

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Entrar
        </h1>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <form action={signIn} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Email
          <input
            className={fieldClassName}
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Contraseña
          <input
            className={fieldClassName}
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={6}
          />
        </label>
        <button className={primaryButtonClassName} type="submit">
          Entrar
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link className="underline" href="/signup">
          Crear cuenta
        </Link>
      </p>
    </main>
  );
}
