import Link from "next/link";
import { createPlayground } from "@/app/playgrounds/actions";
import { requireAccessToken } from "@/lib/session";
import { fieldClassName, primaryButtonClassName } from "@/lib/ui";

export const metadata = {
  title: "Nuevo playground · Piquify",
};

type NewPlaygroundPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function NewPlaygroundPage({
  searchParams,
}: NewPlaygroundPageProps) {
  await requireAccessToken();
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href="/"
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo playground
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Un espacio para los piques del grupo. Tú serás admin.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <form action={createPlayground} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          Nombre
          <input
            className={fieldClassName}
            type="text"
            name="name"
            required
            minLength={1}
            maxLength={80}
            autoFocus
          />
        </label>
        <button className={primaryButtonClassName} type="submit">
          Crear playground
        </button>
      </form>
    </main>
  );
}
