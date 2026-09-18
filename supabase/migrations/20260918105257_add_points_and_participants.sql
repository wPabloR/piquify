-- Points ledger + pique participants. 200 points on signup (ADR-003).

create table public.account_movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('signup', 'pique_join', 'pique_leave')),
  bet_id uuid references public.bets (id) on delete set null,
  created_at timestamptz not null default now()
);

create index account_movements_user_id_idx on public.account_movements (user_id);
create index account_movements_bet_id_idx on public.account_movements (bet_id);

alter table public.profiles
  add column balance integer not null default 0 check (balance >= 0);

create table public.bet_participants (
  bet_id uuid not null references public.bets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.bet_options (id) on delete restrict,
  joined_at timestamptz not null default now(),
  primary key (bet_id, user_id)
);

create index bet_participants_user_id_idx on public.bet_participants (user_id);

update public.profiles set balance = 200;

alter table public.profiles
  alter column balance set default 200;

insert into public.account_movements (user_id, amount, kind)
select id, 200, 'signup'
from public.profiles;

create function public.credit_signup_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_movements (user_id, amount, kind)
  values (new.id, 200, 'signup');
  return new;
end;
$$;

create trigger on_profile_created_credit_points
  after insert on public.profiles
  for each row execute function public.credit_signup_points();

revoke all on function public.credit_signup_points() from public, anon, authenticated;

alter table public.account_movements disable row level security;
alter table public.bet_participants disable row level security;

revoke all on table public.account_movements from anon, authenticated;
revoke all on table public.bet_participants from anon, authenticated;

grant select, insert on table public.account_movements to authenticated;
grant select, insert, delete on table public.bet_participants to authenticated;
