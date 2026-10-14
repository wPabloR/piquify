"use client";

export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-5 py-20 text-center">
      <h1 className="font-display text-3xl font-extrabold text-abismo">No se ha podido cargar</h1>
      <p className="mt-2 text-sm text-tinta-suave">
        Ha fallado la conexión con tus datos. Puedes intentarlo otra vez.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-marea px-4 py-2.5 text-sm font-semibold text-crema"
      >
        Reintentar
      </button>
    </main>
  );
}
