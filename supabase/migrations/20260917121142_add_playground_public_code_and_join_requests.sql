-- Numeric tag (#1000) for playgrounds and join requests a player can send.

create sequence public.playground_public_code_seq as integer start with 1000 owned by none;

alter table public.playgrounds
  add column public_code integer;

update public.playgrounds
set public_code = nextval('public.playground_public_code_seq')
where public_code is null;

alter table public.playgrounds
  alter column public_code set not null,
  alter column public_code set default nextval('public.playground_public_code_seq'),
  add constraint playgrounds_public_code_key unique (public_code);

alter sequence public.playground_public_code_seq owned by public.playgrounds.public_code;

create table public.playground_join_requests (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (playground_id, user_id)
);

create index playground_join_requests_user_pending_idx
  on public.playground_join_requests (user_id)
  where status = 'pending';

create index playground_join_requests_playground_pending_idx
  on public.playground_join_requests (playground_id)
  where status = 'pending';

alter table public.playground_join_requests disable row level security;

revoke all on table public.playground_join_requests from anon, authenticated;
grant select, insert, update on table public.playground_join_requests to authenticated;
