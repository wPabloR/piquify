import Link from "next/link";
import { JoinPlaygroundSearch } from "@/components/join-playground-search";
import { requireAccessToken } from "@/lib/session";

export const metadata = {
  title: "Buscar playground · Piquify",
};

export default async function JoinPlaygroundPage() {
  await requireAccessToken("/playgrounds/join");

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
          Buscar playground
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Busca por nombre o por código (#1000) y solicita acceso. El admin
          aceptará o rechazará tu solicitud.
        </p>
      </div>
      <JoinPlaygroundSearch />
    </main>
  );
}
