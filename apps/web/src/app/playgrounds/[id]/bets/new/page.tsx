import Link from "next/link";
import { CreateBetForm } from "@/components/create-bet-form";
import { fetchPlayground } from "@/lib/api";
import { requireAccessToken } from "@/lib/session";

export const metadata = {
  title: "Nuevo pique · Piquify",
};

type NewBetPageProps = {
  params: Promise<{ id: string }>;
};

export default async function NewBetPage({ params }: NewBetPageProps) {
  const { id } = await params;
  const accessToken = await requireAccessToken(`/playgrounds/${id}/bets/new`);
  const playground = await fetchPlayground(accessToken, id);

  if ("error" in playground) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href={`/playgrounds/${id}`}
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo pique
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400">{playground.error}</p>
      </main>
    );
  }

  if (playground.role !== "admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-6 py-10">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href={`/playgrounds/${id}`}
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo pique
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Solo el admin del playground puede crear piques.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-2">
        <Link
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
          href={`/playgrounds/${id}`}
        >
          Volver
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo pique
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Stake fijo, opciones cerradas y una fecha límite. Se publica abierto.
        </p>
      </div>
      <CreateBetForm playgroundId={id} />
    </main>
  );
}
