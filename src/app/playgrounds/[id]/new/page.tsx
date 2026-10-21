import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CreatePiqueForm } from "@/components/create-pique-form";
import { getViewer, listPlaygrounds } from "@/infrastructure/queries";

export default async function NewPiquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { id } = await params;
  const playgrounds = await listPlaygrounds(viewer.id);
  const playground = playgrounds.find((item) => item.id === id);
  if (!playground || !playground.isAdmin) notFound();

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-20 pt-6 sm:px-5">
      <Link
        href={`/playgrounds/${playground.id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-tinta-suave transition-colors hover:text-marea"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {playground.name}
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">Crear pique</h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Se publicará en {playground.emoji} {playground.name} para sus {playground.memberCount} jugadores.
      </p>
      <div className="mt-7">
        <CreatePiqueForm playgroundId={playground.id} />
      </div>
    </main>
  );
}
