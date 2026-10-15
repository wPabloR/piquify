-- Esquema mínimo para los tests de integración en CI.
-- El rol de la app no tiene UPDATE en ledger_entries: lockLedger no puede
-- usar FOR UPDATE.

create role piquify_app login password 'postgres' nosuperuser noinherit;

create table public.ledger_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null
);

create table public.friendships (
  user_low uuid not null,
  user_high uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high)
);

grant usage on schema public to piquify_app;
grant select, insert on public.ledger_entries to piquify_app;
grant select on public.friendships to piquify_app;
