-- Public numeric tag (#4585) and in-app invitations the invitee can accept or decline.

create sequence public.profile_public_code_seq as integer start with 1000 owned by none;

alter table public.profiles
  add column public_code integer;

update public.profiles
set public_code = nextval('public.profile_public_code_seq')
where public_code is null;

alter table public.profiles
  alter column public_code set not null,
  alter column public_code set default nextval('public.profile_public_code_seq'),
  add constraint profiles_public_code_key unique (public_code);

alter sequence public.profile_public_code_seq owned by public.profiles.public_code;

create table public.playground_invitations (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  invited_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (playground_id, invited_user_id)
);

create index playground_invitations_invited_user_pending_idx
  on public.playground_invitations (invited_user_id)
  where status = 'pending';

alter table public.playground_invitations disable row level security;

revoke all on table public.playground_invitations from anon, authenticated;
grant select, insert, update on table public.playground_invitations to authenticated;
