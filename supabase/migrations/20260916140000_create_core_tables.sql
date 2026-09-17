-- Core social tables. Bets and points come later.
-- Auth owns identity (auth.users); public.profiles is the app user (same UUID).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now()
);

create table public.playgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.playground_members (
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (playground_id, user_id)
);

create index playgrounds_created_by_idx on public.playgrounds (created_by);
create index playground_members_user_id_idx on public.playground_members (user_id);

-- New auth user → profile
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1),
      'user'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New playground → creator is admin
create function public.handle_new_playground()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.playground_members (playground_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_playground_created
  after insert on public.playgrounds
  for each row execute function public.handle_new_playground();

-- RLS helpers (security definer avoids recursive policies on playground_members)
create function public.is_playground_member(p_playground_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.playground_members
    where playground_id = p_playground_id
      and user_id = auth.uid()
  );
$$;

create function public.is_playground_admin(p_playground_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.playground_members
    where playground_id = p_playground_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- Supabase grants EXECUTE on public functions to anon and authenticated through
-- schema default privileges, so revoking from PUBLIC alone still leaves them
-- reachable as /rest/v1/rpc endpoints.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_playground() from public, anon, authenticated;
revoke all on function public.is_playground_member(uuid) from public, anon;
revoke all on function public.is_playground_admin(uuid) from public, anon;

-- Policy expressions run as the querying role, so authenticated needs EXECUTE
-- on the helpers or every query against playgrounds fails.
grant execute on function public.is_playground_member(uuid) to authenticated;
grant execute on function public.is_playground_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.playgrounds enable row level security;
alter table public.playground_members enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.playgrounds from anon, authenticated;
revoke all on table public.playground_members from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.playgrounds to authenticated;
grant select, insert, update, delete on table public.playground_members to authenticated;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "playgrounds_select_member"
  on public.playgrounds for select
  to authenticated
  using (public.is_playground_member(id));

create policy "playgrounds_insert_own"
  on public.playgrounds for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "playgrounds_update_admin"
  on public.playgrounds for update
  to authenticated
  using (public.is_playground_admin(id))
  with check (public.is_playground_admin(id));

create policy "playgrounds_delete_admin"
  on public.playgrounds for delete
  to authenticated
  using (public.is_playground_admin(id));

create policy "members_select_member"
  on public.playground_members for select
  to authenticated
  using (public.is_playground_member(playground_id));

create policy "members_insert_admin"
  on public.playground_members for insert
  to authenticated
  with check (public.is_playground_admin(playground_id));

create policy "members_update_admin"
  on public.playground_members for update
  to authenticated
  using (public.is_playground_admin(playground_id))
  with check (public.is_playground_admin(playground_id));

create policy "members_delete_admin_or_self"
  on public.playground_members for delete
  to authenticated
  using (
    public.is_playground_admin(playground_id)
    or user_id = (select auth.uid())
  );
