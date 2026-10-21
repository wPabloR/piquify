import { redirect } from "next/navigation";
import { getViewer, listAccess } from "@/infrastructure/queries";
import { AccessDecision } from "@/components/access-decision";

export default async function InvitationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const items = await listAccess(viewer.id);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">
        Invitaciones y solicitudes
      </h1>
      <p className="mt-1 text-sm text-tinta-suave">
        Acepta invitaciones a playgrounds y solicitudes de amistad.
      </p>
      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-abismo/20 bg-white/70 px-6 py-10 text-center text-sm text-tinta-suave">
          No tienes invitaciones ni solicitudes pendientes.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="rounded-2xl border border-abismo/10 bg-white p-4 shadow-card">
              <p className="text-sm text-tinta">
                {item.kind === "invitation" ? (
                  <>
                    <strong className="text-abismo">{item.personName}</strong> te invita a{" "}
                    <strong className="text-abismo">{item.playgroundName}</strong>.
                  </>
                ) : item.kind === "own_request" ? (
                  <>
                    Tu solicitud para entrar en{" "}
                    <strong className="text-abismo">{item.playgroundName}</strong> sigue pendiente.
                  </>
                ) : item.kind === "friend_incoming" ? (
                  <>
                    <strong className="text-abismo">{item.personName}</strong> quiere ser tu amigo.
                  </>
                ) : item.kind === "friend_outgoing" ? (
                  <>
                    Tu solicitud de amistad a{" "}
                    <strong className="text-abismo">{item.personName}</strong> sigue pendiente.
                  </>
                ) : (
                  <>
                    <strong className="text-abismo">{item.personName}</strong> quiere entrar en{" "}
                    <strong className="text-abismo">{item.playgroundName}</strong>.
                  </>
                )}
              </p>
              {item.kind === "own_request" || item.kind === "friend_outgoing" ? null : (
                <AccessDecision
                  kind={
                    item.kind === "invitation"
                      ? "invitation"
                      : item.kind === "friend_incoming"
                        ? "friend"
                        : "request"
                  }
                  id={item.id}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
