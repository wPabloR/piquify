import type postgres from "postgres";
import { LIKE_ESCAPE, likeContains } from "@/domain/like";
import type { UnitOfWork } from "@/application/ports";

type Sql = postgres.Sql | postgres.TransactionSql;

export type FriendStores = Pick<
  UnitOfWork,
  | "profileByFriendCode"
  | "searchPeople"
  | "friendshipExists"
  | "pendingFriendRequest"
  | "insertFriendRequest"
  | "lockFriendRequest"
  | "setFriendRequestStatus"
  | "insertFriendship"
  | "deleteFriendship"
  | "listFriends"
  | "listPendingFriendRequests"
>;

export function createFriendStores(tx: Sql): FriendStores {
  return {
    async profileByFriendCode(code) {
      const [row] = await tx<{ id: string; display_name: string; handle: string }[]>`
        select id, display_name, handle from public.profiles where friend_code = ${code}
      `;
      return row ? { id: row.id, name: row.display_name, handle: row.handle } : null;
    },
    async searchPeople(userId, query) {
      const needle = likeContains(query.toLowerCase().replace(/^@/, ""));
      const exact = query.replace(/[\s-]/g, "").toUpperCase();
      const rows = await tx<
        {
          id: string;
          display_name: string;
          handle: string;
          is_friend: boolean;
          pending_from_actor: boolean;
          pending_from_other: boolean;
          incoming_request_id: string | null;
        }[]
      >`
        select
          p.id,
          p.display_name,
          p.handle,
          exists (
            select 1 from public.friendships f
            where f.user_low = least(${userId}::uuid, p.id)
              and f.user_high = greatest(${userId}::uuid, p.id)
          ) as is_friend,
          exists (
            select 1 from public.friend_requests r
            where r.requester_id = ${userId}::uuid
              and r.addressee_id = p.id
              and r.status = 'pending'
          ) as pending_from_actor,
          exists (
            select 1 from public.friend_requests r
            where r.requester_id = p.id
              and r.addressee_id = ${userId}::uuid
              and r.status = 'pending'
          ) as pending_from_other,
          (
            select r.id from public.friend_requests r
            where r.requester_id = p.id
              and r.addressee_id = ${userId}::uuid
              and r.status = 'pending'
            limit 1
          ) as incoming_request_id
        from public.profiles p
        where p.id <> ${userId}::uuid
          and (
            lower(p.display_name) like ${needle} escape ${LIKE_ESCAPE}
            or lower(p.handle) like ${needle} escape ${LIKE_ESCAPE}
            or p.friend_code = ${exact}
          )
        order by p.display_name
        limit 20
      `;
      return rows.map((row) => ({
        id: row.id,
        name: row.display_name,
        handle: row.handle,
        isFriend: Boolean(row.is_friend),
        pendingFromActor: Boolean(row.pending_from_actor),
        pendingFromOther: Boolean(row.pending_from_other),
        incomingRequestId: row.incoming_request_id,
      }));
    },
    async friendshipExists(userA, userB) {
      const [row] = await tx<{ ok: boolean }[]>`
        select exists (
          select 1 from public.friendships
          where user_low = least(${userA}::uuid, ${userB}::uuid)
            and user_high = greatest(${userA}::uuid, ${userB}::uuid)
        ) as ok
      `;
      return Boolean(row?.ok);
    },
    async pendingFriendRequest(fromId, toId) {
      const [row] = await tx<{ id: string }[]>`
        select id from public.friend_requests
        where requester_id = ${fromId}::uuid
          and addressee_id = ${toId}::uuid
          and status = 'pending'
      `;
      return row ?? null;
    },
    async insertFriendRequest(requesterId, addresseeId) {
      const [row] = await tx<{ id: string }[]>`
        insert into public.friend_requests (requester_id, addressee_id)
        values (${requesterId}::uuid, ${addresseeId}::uuid)
        returning id
      `;
      if (!row) throw new Error("INVALID_RESPONSE");
      return row.id;
    },
    async lockFriendRequest(id) {
      const [row] = await tx<{
        id: string;
        requester_id: string;
        addressee_id: string;
        status: string;
      }[]>`
        select id, requester_id, addressee_id, status
        from public.friend_requests
        where id = ${id}::uuid
        for update
      `;
      return row
        ? {
            id: row.id,
            requesterId: row.requester_id,
            addresseeId: row.addressee_id,
            status: row.status,
          }
        : null;
    },
    async setFriendRequestStatus(id, status) {
      await tx`
        update public.friend_requests
        set status = ${status}::public.access_status
        where id = ${id}::uuid
      `;
    },
    async insertFriendship(userA, userB) {
      await tx`
        insert into public.friendships (user_low, user_high)
        values (least(${userA}::uuid, ${userB}::uuid), greatest(${userA}::uuid, ${userB}::uuid))
        on conflict do nothing
      `;
    },
    async deleteFriendship(userA, userB) {
      await tx`
        delete from public.friendships
        where user_low = least(${userA}::uuid, ${userB}::uuid)
          and user_high = greatest(${userA}::uuid, ${userB}::uuid)
      `;
    },
    async listFriends(userId) {
      const rows = await tx<{ id: string; display_name: string; handle: string }[]>`
        select p.id, p.display_name, p.handle
        from public.friendships f
        join public.profiles p
          on p.id = case when f.user_low = ${userId}::uuid then f.user_high else f.user_low end
        where f.user_low = ${userId}::uuid or f.user_high = ${userId}::uuid
        order by p.display_name
      `;
      return rows.map((row) => ({ id: row.id, name: row.display_name, handle: row.handle }));
    },
    async listPendingFriendRequests(userId) {
      const rows = await tx<
        {
          id: string;
          person_id: string;
          display_name: string;
          handle: string;
          direction: "incoming" | "outgoing";
        }[]
      >`
        select
          r.id,
          case when r.requester_id = ${userId}::uuid then r.addressee_id else r.requester_id end as person_id,
          p.display_name,
          p.handle,
          case when r.requester_id = ${userId}::uuid then 'outgoing' else 'incoming' end as direction
        from public.friend_requests r
        join public.profiles p
          on p.id = case when r.requester_id = ${userId}::uuid then r.addressee_id else r.requester_id end
        where r.status = 'pending'
          and (r.requester_id = ${userId}::uuid or r.addressee_id = ${userId}::uuid)
        order by r.created_at desc
      `;
      return rows.map((row) => ({
        id: row.id,
        personId: row.person_id,
        name: row.display_name,
        handle: row.handle,
        direction: row.direction,
      }));
    },
  };
}
