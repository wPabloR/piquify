-- Refund the stake to every participant when nobody hits.

alter table public.account_movements
  drop constraint account_movements_kind_check;

alter table public.account_movements
  add constraint account_movements_kind_check
  check (kind in ('signup', 'pique_join', 'pique_leave', 'pique_win', 'pique_refund'));

create unique index account_movements_pique_refund_unique
  on public.account_movements (bet_id, user_id)
  where kind = 'pique_refund';
