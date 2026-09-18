-- Payout credits the winner with the confirming user's JWT. The own-row
-- update policy blocked that, so the last vote failed and nobody was paid.
-- Same as playgrounds and bets: the API authorizes.

alter table public.profiles disable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

notify pgrst, 'reload schema';
