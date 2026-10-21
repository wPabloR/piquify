import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/safe-path";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: raw } = await searchParams;
  const next = safeNextPath(raw) ?? undefined;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10 sm:px-5">
      <section className="w-full rounded-3xl border border-abismo/10 bg-white p-6 shadow-card sm:p-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">
          Crea tu cuenta
        </h1>
        <p className="mt-1 mb-6 text-sm text-tinta-suave">
          Te enviaremos un correo para confirmar la cuenta. Empiezas con 200 puntos.
        </p>
        <AuthForm mode="signup" next={next} />
      </section>
    </main>
  );
}
