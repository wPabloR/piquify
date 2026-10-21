import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { FriendRequestForm } from "@/components/friend-request-form";
import { parseFriendCode } from "@/domain/friends";
import { getProfileByFriendCode, getViewer, listFriends } from "@/infrastructure/queries";

export default async function AddFriendPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { code } = await params;
  const parsed = parseFriendCode(code);
  if (!parsed.ok) notFound();
  const profile = await getProfileByFriendCode(parsed.value);
  if (!profile) notFound();
  if (profile.id === viewer.id) {
    redirect("/profile");
  }
  const friends = await listFriends(viewer.id);
  const already = friends.some((item) => item.id === profile.id);

  return (
    <main className="mx-auto max-w-lg px-4 pb-20 pt-8 sm:px-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-abismo">
        Añadir amigo
      </h1>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
        <Avatar name={profile.name} />
        <div>
          <p className="font-medium text-abismo">{profile.name}</p>
          <p className="text-sm text-tinta-suave">@{profile.handle}</p>
        </div>
      </div>
      <div className="mt-4">
        {already ? (
          <p className="text-sm font-medium text-palma">Ya sois amigos.</p>
        ) : (
          <FriendRequestForm userId={profile.id} label={`Enviar solicitud a @${profile.handle}`} />
        )}
      </div>
    </main>
  );
}
