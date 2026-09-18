-- Admin proposes a result; participants have 48h to confirm before payout.

alter table public.bets
  drop constraint if exists bets_status_check;

alter table public.bets
  add constraint bets_status_check
  check (status in ('open', 'locked', 'pending_result', 'resolved', 'cancelled'));

alter table public.bets
  add column if not exists vote_closes_at timestamptz;

create table if not exists public.bet_result_votes (
  bet_id uuid not null references public.bets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  choice text not null check (choice in ('confirm', 'reject')),
  suggested_option_id uuid references public.bet_options (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (bet_id, user_id),
  check (
    (choice = 'confirm' and suggested_option_id is null)
    or (choice = 'reject' and suggested_option_id is not null)
  )
);

create index if not exists bet_result_votes_user_id_idx
  on public.bet_result_votes (user_id);

alter table public.bet_result_votes disable row level security;

revoke all on table public.bet_result_votes from anon, authenticated;
grant select, insert, update, delete on table public.bet_result_votes to authenticated;

notify pgrst, 'reload schema';
