-- Pay winners when a pique is resolved. Remainder is a residual pot
-- tagged with the exact participant set (ADR reglamento).

alter table public.account_movements
  drop constraint account_movements_kind_check;

alter table public.account_movements
  add constraint account_movements_kind_check
  check (kind in ('signup', 'pique_join', 'pique_leave', 'pique_win'));

create unique index account_movements_pique_win_unique
  on public.account_movements (bet_id, user_id)
  where kind = 'pique_win';

alter table public.bets
  add column settled_at timestamptz;

create table public.residual_pots (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  source_bet_id uuid not null unique references public.bets (id) on delete restrict,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table public.residual_pot_members (
  pot_id uuid not null references public.residual_pots (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (pot_id, user_id)
);

create index residual_pots_playground_id_idx on public.residual_pots (playground_id);
create index residual_pot_members_user_id_idx on public.residual_pot_members (user_id);

alter table public.residual_pots disable row level security;
alter table public.residual_pot_members disable row level security;

revoke all on table public.residual_pots from anon, authenticated;
revoke all on table public.residual_pot_members from anon, authenticated;

grant select, insert on table public.residual_pots to authenticated;
grant select, insert on table public.residual_pot_members to authenticated;
