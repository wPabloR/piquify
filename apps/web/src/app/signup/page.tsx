import Link from "next/link";
import { signUp } from "@/app/auth/actions";

const fieldClassName =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

type SignupPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-zinc-500">
            Piquify
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Crear cuenta
          </h1>
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <form action={signUp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Alias
            <input
              className={fieldClassName}
              type="text"
              name="displayName"
              autoComplete="nickname"
              required
              minLength={1}
              maxLength={50}
            />
          </label>
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
              autoComplete="new-password"
              required
              minLength={6}
            />
          </label>
          <button
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
            type="submit"
          >
            Crear cuenta
          </button>
        </form>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes cuenta?{" "}
          <Link className="underline" href="/login">
            Entrar
          </Link>
        </p>
      </main>
    </div>
  );
}
