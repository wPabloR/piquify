import { redirect } from "next/navigation";
import { ActivityList } from "@/components/activity-list";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { getViewer, listActivity } from "@/infrastructure/queries";

export default async function NotificationsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const items = await listActivity(40);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-5">
      <MarkNotificationsRead />
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">Actividad</h1>
      <div className="mt-6 rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <ActivityList items={items} empty="Todavía no hay avisos." />
      </div>
    </main>
  );
}
