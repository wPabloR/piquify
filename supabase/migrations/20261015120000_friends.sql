-- Códigos de amigo, solicitudes y amistades.
-- Las lecturas de clientes van por RLS; piquify_app escribe el dominio.

alter type public.notification_kind add value if not exists 'friend_request';
alter type public.notification_kind add value if not exists 'friend_accepted';

alter table public.profiles
  add column if not exists friend_code text;

do $$
declare
  r record;
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  code text;
  i integer;
begin
  for r in select id from public.profiles where friend_code is null loop
    loop
      code := '';
      for i in 1..8 loop
        code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
      end loop;
      exit when not exists (select 1 from public.profiles p where p.friend_code = code);
    end loop;
    update public.profiles set friend_code = code where id = r.id;
  end loop;
end
$$;

alter table public.profiles
  alter column friend_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_friend_code_key'
  ) then
    alter table public.profiles add constraint profiles_friend_code_key unique (friend_code);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_friend_code_format'
  ) then
    alter table public.profiles
      add constraint profiles_friend_code_format
      check (friend_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$');
  end if;
end
$$;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.access_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friend_requests_pending_pair
  on public.friend_requests (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  )
  where status = 'pending';

create index if not exists friend_requests_addressee_idx
  on public.friend_requests (addressee_id, status);

create table if not exists public.friendships (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.invitations i
      where i.status = 'pending'
        and (
          (i.invitee_id = (select auth.uid()) and i.inviter_id = profiles.id)
          or (
            i.invitee_id = profiles.id
            and exists (
              select 1 from public.playground_members adm
              where adm.playground_id = i.playground_id
                and adm.user_id = (select auth.uid())
                and adm.role = 'admin'
            )
          )
        )
    )
    or exists (
      select 1 from public.join_requests r
      where r.status = 'pending'
        and r.user_id = profiles.id
        and exists (
          select 1 from public.playground_members adm
          where adm.playground_id = r.playground_id
            and adm.user_id = (select auth.uid())
            and adm.role = 'admin'
        )
    )
    or exists (
      select 1 from public.friendships f
      where (f.user_low = (select auth.uid()) and f.user_high = profiles.id)
         or (f.user_high = (select auth.uid()) and f.user_low = profiles.id)
    )
    or exists (
      select 1 from public.friend_requests r
      where r.status = 'pending'
        and (
          (r.requester_id = (select auth.uid()) and r.addressee_id = profiles.id)
          or (r.addressee_id = (select auth.uid()) and r.requester_id = profiles.id)
        )
    )
  );

create policy friend_requests_select on public.friend_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or addressee_id = (select auth.uid())
  );

create policy friendships_select on public.friendships
  for select to authenticated
  using (
    user_low = (select auth.uid())
    or user_high = (select auth.uid())
  );

grant select on public.friend_requests, public.friendships to authenticated;

grant select, insert on public.friend_requests, public.friendships to piquify_app;
grant update (status) on public.friend_requests to piquify_app;
grant delete on public.friendships to piquify_app;

create policy piquify_app_friend_requests on public.friend_requests
  for all to piquify_app using (true) with check (true);
create policy piquify_app_friendships on public.friendships
  for all to piquify_app using (true) with check (true);
