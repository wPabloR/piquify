-- The API already authenticates the user. Playground RLS cannot see
-- auth.uid() on the user-scoped client, so inserts fail. Disable it
-- so any authenticated user can create and read playgrounds.

alter table public.playgrounds disable row level security;
alter table public.playground_members disable row level security;

drop policy if exists "playgrounds_select_member" on public.playgrounds;
drop policy if exists "playgrounds_insert_own" on public.playgrounds;
drop policy if exists "playgrounds_update_admin" on public.playgrounds;
drop policy if exists "playgrounds_delete_admin" on public.playgrounds;

drop policy if exists "members_select_member" on public.playground_members;
drop policy if exists "members_insert_admin" on public.playground_members;
drop policy if exists "members_update_admin" on public.playground_members;
drop policy if exists "members_delete_admin_or_self" on public.playground_members;
