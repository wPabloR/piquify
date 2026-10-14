import { mutate } from "@/app/api/v1/_lib/http";
import { markNotificationsRead } from "@/application/mark-notifications-read";

export async function POST(request: Request) {
  return mutate(request, (uow, actorId) => markNotificationsRead(uow, { actorId }));
}
