-- Porras inside a playground. Participation and points come later.

create table public.bets (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 80),
  stake integer not null check (stake >= 1),
  deadline timestamptz not null,
  status text not null check (status in ('open', 'locked', 'resolved', 'cancelled')),
  winning_option_id uuid,
  created_at timestamptz not null default now()
);

create table public.bet_options (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  position integer not null check (position >= 0),
  unique (bet_id, position)
);

alter table public.bets
  add constraint bets_winning_option_id_fkey
  foreign key (winning_option_id) references public.bet_options (id)
  on delete set null;

create index bets_playground_id_idx on public.bets (playground_id);
create index bets_created_by_idx on public.bets (created_by);
create index bet_options_bet_id_idx on public.bet_options (bet_id);

-- Same as playgrounds: the API authorizes; auth.uid() is not visible on the
-- user-scoped Express client, so RLS would block every insert.
alter table public.bets disable row level security;
alter table public.bet_options disable row level security;

revoke all on table public.bets from anon, authenticated;
revoke all on table public.bet_options from anon, authenticated;

grant select, insert, update, delete on table public.bets to authenticated;
grant select, insert, update on table public.bet_options to authenticated;
