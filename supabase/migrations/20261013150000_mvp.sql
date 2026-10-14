-- MVP transaccional de Piquify.
-- Las reglas de votación y reparto siguen a src/domain/settlement.ts y src/domain/money.ts.

create extension if not exists pgcrypto with schema extensions;

create type public.member_role as enum ('admin', 'member');
create type public.pique_status as enum (
  'draft', 'open', 'locked', 'pending_result', 'resolved', 'cancelled'
);
create type public.pique_kind as enum ('options', 'date', 'number');
create type public.access_status as enum ('pending', 'accepted', 'declined');
create type public.ledger_kind as enum (
  'opening_balance', 'stake_hold', 'stake_refund', 'payout'
);
create type public.vote_decision as enum ('approve', 'reject');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);

create table public.playgrounds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  tagline text not null default '' check (char_length(tagline) <= 140),
  emoji text not null check (char_length(emoji) between 1 and 16),
  admin_id uuid not null references public.profiles (id),
  public_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (public_code ~ '^[a-f0-9]{8}$')
);

create table public.playground_members (
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  primary key (playground_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id),
  invitee_id uuid not null references public.profiles (id),
  status public.access_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (playground_id, invitee_id, status)
);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.access_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (playground_id, user_id, status)
);

create table public.piques (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  question text not null check (char_length(question) between 4 and 180),
  detail text check (detail is null or char_length(detail) <= 500),
  kind public.pique_kind not null,
  status public.pique_status not null default 'open',
  stake integer not null check (stake between 1 and 100000),
  closes_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  allow_new_options boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.pique_options (
  id uuid primary key default gen_random_uuid(),
  pique_id uuid not null references public.piques (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  position integer not null check (position >= 0),
  unique (pique_id, position)
);

create table public.participations (
  pique_id uuid not null references public.piques (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.pique_options (id),
  created_at timestamptz not null default now(),
  primary key (pique_id, user_id)
);

create table public.result_proposals (
  pique_id uuid primary key references public.piques (id) on delete cascade,
  option_id uuid not null references public.pique_options (id),
  proposed_by uuid not null references public.profiles (id),
  proposed_at timestamptz not null default now(),
  voting_ends_at timestamptz not null
);

create table public.result_votes (
  pique_id uuid not null references public.piques (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  decision public.vote_decision not null,
  suggested_option_id uuid references public.pique_options (id),
  created_at timestamptz not null default now(),
  primary key (pique_id, user_id)
);

create table public.pique_winners (
  pique_id uuid not null references public.piques (id) on delete cascade,
  option_id uuid not null references public.pique_options (id),
  primary key (pique_id, option_id)
);

create table public.residuals (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds (id) on delete cascade,
  amount integer not null check (amount > 0),
  participant_key text not null,
  participant_ids uuid[] not null,
  source_pique_id uuid not null references public.piques (id),
  consumed_by_pique_id uuid references public.piques (id),
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind public.ledger_kind not null,
  playground_id uuid references public.playgrounds (id),
  pique_id uuid references public.piques (id),
  created_at timestamptz not null default now()
);

create unique index ledger_one_opening
  on public.ledger_entries (user_id)
  where kind = 'opening_balance';
create unique index ledger_one_hold
  on public.ledger_entries (user_id, pique_id)
  where kind = 'stake_hold';
create unique index ledger_one_refund
  on public.ledger_entries (user_id, pique_id)
  where kind = 'stake_refund';
create unique index ledger_one_payout
  on public.ledger_entries (user_id, pique_id)
  where kind = 'payout';
create index ledger_user_idx on public.ledger_entries (user_id);
create index ledger_playground_idx on public.ledger_entries (playground_id);
create index piques_playground_idx on public.piques (playground_id, status);
create index members_user_idx on public.playground_members (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  playground_id uuid references public.playgrounds (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  body text not null check (char_length(body) between 1 and 240),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);
create index notifications_playground_idx on public.notifications (playground_id);
create index invitations_invitee_idx on public.invitations (invitee_id);
create index join_requests_user_idx on public.join_requests (user_id);
create index participations_user_idx on public.participations (user_id);
create index residuals_open_idx on public.residuals (playground_id, participant_key)
  where consumed_by_pique_id is null;

create function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'LEDGER_IMMUTABLE';
end;
$$;

create trigger ledger_immutable
  before update or delete on public.ledger_entries
  for each row execute function public.prevent_ledger_mutation();

create function public.participant_key(p_ids uuid[])
returns text
language sql
immutable
set search_path = public
as $$
  select encode(
    extensions.digest(
      coalesce((
        select string_agg(id::text, ',' order by id)
        from unnest(p_ids) as id
      ), ''),
      'sha256'
    ),
    'hex'
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_handle text;
  v_base text;
  v_attempt integer := 0;
begin
  v_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), 60);
  if char_length(v_name) < 2 then
    v_name := 'Jugador';
  end if;

  v_base := lower(coalesce(new.raw_user_meta_data->>'handle', ''));
  if v_base !~ '^[a-z0-9_]{3,24}$' then
    v_base := left(regexp_replace(lower(split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-z0-9_]', '', 'g'), 18);
    if char_length(v_base) < 3 then
      v_base := 'user';
    end if;
  end if;
  v_handle := v_base;

  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_attempt := v_attempt + 1;
    v_handle := left(v_base, 16) || v_attempt::text || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    if char_length(v_handle) > 24 then
      v_handle := left(v_handle, 24);
    end if;
    if v_attempt > 5 then
      raise exception 'INVALID_INPUT';
    end if;
  end loop;

  insert into public.profiles (id, display_name, handle)
  values (new.id, v_name, v_handle);
  insert into public.ledger_entries (user_id, amount, kind)
  values (new.id, 200, 'opening_balance');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.notify_members(p_playground uuid, p_actor uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, playground_id, actor_id, body)
  select user_id, p_playground, p_actor, left(p_body, 240)
  from public.playground_members
  where playground_id = p_playground
    and user_id is distinct from p_actor;
  update public.playgrounds set updated_at = now() where id = p_playground;
end;
$$;

create function public.resolve_pique(p_pique_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pique public.piques%rowtype;
  v_proposal public.result_proposals%rowtype;
  v_participants uuid[];
  v_participant uuid;
  v_decision public.vote_decision;
  v_suggestion uuid;
  v_found boolean;
  v_approves integer := 0;
  v_rejects integer := 0;
  v_top integer := 0;
  v_winners uuid[];
  v_people uuid[];
  v_pot integer;
  v_share integer;
  v_residual integer;
  v_key text;
  v_residual_amount integer := 0;
  v_proposer_plays boolean;
begin
  select * into v_pique from public.piques where id = p_pique_id for update;
  if not found or v_pique.status <> 'pending_result' then
    return;
  end if;

  select * into v_proposal from public.result_proposals where pique_id = p_pique_id;
  if not found then
    return;
  end if;

  select coalesce(array_agg(user_id order by user_id), '{}')
    into v_participants
  from public.participations
  where pique_id = p_pique_id;

  if cardinality(v_participants) = 0 then
    return;
  end if;

  v_proposer_plays := v_proposal.proposed_by = any (v_participants);
  if v_proposer_plays then
    v_approves := 1;
  end if;

  foreach v_participant in array v_participants loop
    if v_proposer_plays and v_participant = v_proposal.proposed_by then
      continue;
    end if;

    select decision, suggested_option_id, true
      into v_decision, v_suggestion, v_found
    from public.result_votes
    where pique_id = p_pique_id and user_id = v_participant;

    if not found then
      if v_proposal.voting_ends_at > now() then
        return;
      end if;
      v_approves := v_approves + 1;
    elsif v_decision = 'approve' then
      v_approves := v_approves + 1;
    else
      v_rejects := v_rejects + 1;
    end if;
  end loop;

  if v_rejects > v_approves then
    select coalesce(max(total), 0) into v_top
    from (
      select count(*) as total
      from public.result_votes
      where pique_id = p_pique_id
        and decision = 'reject'
        and suggested_option_id is not null
        and user_id = any (v_participants)
        and not (v_proposer_plays and user_id = v_proposal.proposed_by)
      group by suggested_option_id
    ) tallies;

    if v_top = 0 then
      v_winners := array[v_proposal.option_id];
    else
      select coalesce(array_agg(suggested_option_id order by suggested_option_id), '{}')
        into v_winners
      from (
        select suggested_option_id
        from public.result_votes
        where pique_id = p_pique_id
          and decision = 'reject'
          and suggested_option_id is not null
          and user_id = any (v_participants)
          and not (v_proposer_plays and user_id = v_proposal.proposed_by)
        group by suggested_option_id
        having count(*) = v_top
      ) winners;
    end if;
  else
    v_winners := array[v_proposal.option_id];
  end if;

  if v_winners is null or cardinality(v_winners) = 0 then
    v_winners := array[v_proposal.option_id];
  end if;

  v_key := public.participant_key(v_participants);
  perform 1
  from public.residuals
  where playground_id = v_pique.playground_id
    and consumed_by_pique_id is null
    and participant_key = v_key
  for update;

  select coalesce(sum(amount), 0) into v_residual_amount
  from public.residuals
  where playground_id = v_pique.playground_id
    and consumed_by_pique_id is null
    and participant_key = v_key;

  v_pot := v_pique.stake * cardinality(v_participants) + v_residual_amount;

  select coalesce(array_agg(user_id order by user_id), '{}')
    into v_people
  from public.participations
  where pique_id = p_pique_id
    and option_id = any (v_winners);

  if cardinality(v_people) = 0 then
    v_share := 0;
    v_residual := v_pot;
  else
    v_share := v_pot / cardinality(v_people);
    v_residual := v_pot - v_share * cardinality(v_people);
  end if;

  if v_share > 0 then
    insert into public.ledger_entries (user_id, amount, kind, playground_id, pique_id)
    select user_id, v_share, 'payout', v_pique.playground_id, p_pique_id
    from unnest(v_people) as user_id;
  end if;

  update public.residuals
  set consumed_by_pique_id = p_pique_id
  where playground_id = v_pique.playground_id
    and consumed_by_pique_id is null
    and participant_key = v_key;

  if v_residual > 0 then
    insert into public.residuals (
      playground_id, amount, participant_key, participant_ids, source_pique_id
    ) values (
      v_pique.playground_id, v_residual, v_key, v_participants, p_pique_id
    );
  end if;

  insert into public.pique_winners (pique_id, option_id)
  select p_pique_id, option_id from unnest(v_winners) as option_id;

  update public.piques
  set status = 'resolved', resolved_at = now(), updated_at = now()
  where id = p_pique_id;

  perform public.notify_members(
    v_pique.playground_id,
    v_proposal.proposed_by,
    'Resultado listo: ' || v_pique.question
  );
end;
$$;

create function public.sync_piques()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  update public.piques p
  set status = case
      when (select count(*) from public.participations x where x.pique_id = p.id) = 0
        then 'cancelled'::public.pique_status
      else 'locked'::public.pique_status
    end,
    updated_at = now()
  where p.status = 'open'
    and p.closes_at <= now();

  for v_id in
    select p.id
    from public.piques p
    join public.result_proposals r on r.pique_id = p.id
    where p.status = 'pending_result'
      and r.voting_ends_at <= now()
  loop
    perform public.resolve_pique(v_id);
  end loop;
end;
$$;

create function public.is_playground_member(p_playground uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = auth.uid()
  );
$$;

create function public.is_playground_admin(p_playground uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = auth.uid() and role = 'admin'
  );
$$;

create function public.my_balance()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from public.ledger_entries
  where user_id = auth.uid();
$$;

create function public.create_playground(
  p_name text,
  p_tagline text,
  p_emoji text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(trim(p_name)) not between 2 and 60
    or char_length(trim(p_tagline)) > 140
    or char_length(trim(p_emoji)) not between 1 and 16 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.playgrounds (name, tagline, emoji, admin_id)
  values (trim(p_name), trim(p_tagline), trim(p_emoji), v_user)
  returning id into v_id;

  insert into public.playground_members (playground_id, user_id, role)
  values (v_id, v_user, 'admin');
  return v_id;
end;
$$;

create function public.invite_to_playground(p_playground uuid, p_handle text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invitee uuid;
  v_id uuid;
  v_name text;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = v_user and role = 'admin'
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  select id, display_name into v_invitee, v_name
  from public.profiles
  where handle = lower(trim(p_handle));
  if v_invitee is null then raise exception 'USER_NOT_FOUND'; end if;
  if v_invitee = v_user then raise exception 'INVALID_INPUT'; end if;
  if exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = v_invitee
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;
  if exists (
    select 1 from public.invitations
    where playground_id = p_playground and invitee_id = v_invitee and status = 'pending'
  ) then
    raise exception 'INVITE_EXISTS';
  end if;

  insert into public.invitations (playground_id, inviter_id, invitee_id)
  values (p_playground, v_user, v_invitee)
  returning id into v_id;

  insert into public.notifications (user_id, playground_id, actor_id, body)
  values (v_invitee, p_playground, v_user, 'Te han invitado a un playground.');
  return v_id;
end;
$$;

create function public.respond_to_invitation(p_invitation uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.invitations%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_row from public.invitations where id = p_invitation for update;
  if not found or v_row.invitee_id <> v_user or v_row.status <> 'pending' then
    raise exception 'NOT_FOUND';
  end if;

  update public.invitations
  set status = case when p_accept then 'accepted'::public.access_status else 'declined'::public.access_status end
  where id = p_invitation;

  if p_accept and not exists (
    select 1 from public.playground_members
    where playground_id = v_row.playground_id and user_id = v_user
  ) then
    insert into public.playground_members (playground_id, user_id, role)
    values (v_row.playground_id, v_user, 'member');
    perform public.notify_members(v_row.playground_id, v_user, 'Hay una nueva incorporación.');
  end if;
end;
$$;

create function public.request_playground_access(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_playground uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select id into v_playground
  from public.playgrounds
  where public_code = lower(trim(p_code));
  if v_playground is null then raise exception 'NOT_FOUND'; end if;
  if exists (
    select 1 from public.playground_members
    where playground_id = v_playground and user_id = v_user
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;
  if exists (
    select 1 from public.join_requests
    where playground_id = v_playground and user_id = v_user and status = 'pending'
  ) then
    raise exception 'REQUEST_EXISTS';
  end if;

  insert into public.join_requests (playground_id, user_id)
  values (v_playground, v_user)
  returning id into v_id;
  perform public.notify_members(v_playground, v_user, 'Hay una solicitud nueva para entrar.');
  return v_id;
end;
$$;

create function public.respond_to_join_request(p_request uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.join_requests%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_row from public.join_requests where id = p_request for update;
  if not found or v_row.status <> 'pending' then raise exception 'NOT_FOUND'; end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = v_row.playground_id and user_id = v_user and role = 'admin'
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  update public.join_requests
  set status = case when p_accept then 'accepted'::public.access_status else 'declined'::public.access_status end
  where id = p_request;

  if p_accept and not exists (
    select 1 from public.playground_members
    where playground_id = v_row.playground_id and user_id = v_row.user_id
  ) then
    insert into public.playground_members (playground_id, user_id, role)
    values (v_row.playground_id, v_row.user_id, 'member');
  end if;

  insert into public.notifications (user_id, playground_id, actor_id, body)
  values (
    v_row.user_id,
    v_row.playground_id,
    v_user,
    case when p_accept then 'Tu solicitud fue aceptada.' else 'Tu solicitud fue rechazada.' end
  );
end;
$$;

create function public.create_pique(
  p_playground uuid,
  p_question text,
  p_detail text,
  p_kind public.pique_kind,
  p_stake integer,
  p_closes_at timestamptz,
  p_options text[],
  p_allow_new_options boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_option text;
  v_position integer := 0;
  v_clean text[];
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = v_user and role = 'admin'
  ) then
    raise exception 'NOT_ADMIN';
  end if;
  if p_stake is null or p_stake < 1 or p_stake > 100000 or p_closes_at <= now() then
    raise exception 'INVALID_INPUT';
  end if;
  if char_length(trim(p_question)) not between 4 and 180 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_detail is not null and char_length(trim(p_detail)) > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(array_agg(value order by ordinality), '{}')
    into v_clean
  from (
    select trim(option_value) as value, ordinality
    from unnest(p_options) with ordinality as item(option_value, ordinality)
    where char_length(trim(option_value)) between 1 and 80
  ) cleaned;

  if cardinality(v_clean) < 2 or cardinality(v_clean) > 12
    or cardinality(v_clean) <> (
      select count(distinct lower(value)) from unnest(v_clean) as value
    ) then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.piques (
    playground_id, question, detail, kind, status, stake, closes_at, created_by, allow_new_options
  ) values (
    p_playground,
    trim(p_question),
    nullif(trim(coalesce(p_detail, '')), ''),
    p_kind,
    'open',
    p_stake,
    p_closes_at,
    v_user,
    coalesce(p_allow_new_options, false)
  ) returning id into v_id;

  foreach v_option in array v_clean loop
    insert into public.pique_options (pique_id, label, position)
    values (v_id, v_option, v_position);
    v_position := v_position + 1;
  end loop;

  perform public.notify_members(p_playground, v_user, 'Nuevo pique: ' || trim(p_question));
  return v_id;
end;
$$;

create function public.add_pique_option(p_pique uuid, p_label text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pique public.piques%rowtype;
  v_id uuid;
  v_position integer;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_pique from public.piques where id = p_pique for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not v_pique.allow_new_options or v_pique.status <> 'open' or v_pique.closes_at <= now() then
    raise exception 'PIQUE_CLOSED';
  end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = v_pique.playground_id and user_id = v_user
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if char_length(trim(p_label)) not between 1 and 80 then
    raise exception 'INVALID_INPUT';
  end if;
  if exists (
    select 1 from public.pique_options
    where pique_id = p_pique and lower(label) = lower(trim(p_label))
  ) then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(max(position) + 1, 0) into v_position
  from public.pique_options where pique_id = p_pique;
  if v_position > 11 then raise exception 'INVALID_INPUT'; end if;

  insert into public.pique_options (pique_id, label, position)
  values (p_pique, trim(p_label), v_position)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.join_pique(p_pique uuid, p_option uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pique public.piques%rowtype;
  v_balance integer;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_pique from public.piques where id = p_pique for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_pique.status <> 'open' or v_pique.closes_at <= now() then
    raise exception 'PIQUE_CLOSED';
  end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = v_pique.playground_id and user_id = v_user
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if not exists (
    select 1 from public.pique_options
    where id = p_option and pique_id = p_pique
  ) then
    raise exception 'INVALID_OPTION';
  end if;

  if exists (
    select 1 from public.participations
    where pique_id = p_pique and user_id = v_user
  ) then
    update public.participations
    set option_id = p_option
    where pique_id = p_pique and user_id = v_user;
    return;
  end if;

  perform 1 from public.ledger_entries where user_id = v_user for update;
  select coalesce(sum(amount), 0) into v_balance
  from public.ledger_entries where user_id = v_user;
  if v_balance < v_pique.stake then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  insert into public.participations (pique_id, user_id, option_id)
  values (p_pique, v_user, p_option);
  insert into public.ledger_entries (user_id, amount, kind, playground_id, pique_id)
  values (v_user, -v_pique.stake, 'stake_hold', v_pique.playground_id, p_pique);
  perform public.notify_members(
    v_pique.playground_id,
    v_user,
    'Nueva participación en: ' || v_pique.question
  );
end;
$$;

create function public.leave_pique(p_pique uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pique public.piques%rowtype;
  v_remaining integer;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select * into v_pique from public.piques where id = p_pique for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_pique.status <> 'open' or v_pique.closes_at <= now() then
    raise exception 'PIQUE_CLOSED';
  end if;
  if not exists (
    select 1 from public.participations
    where pique_id = p_pique and user_id = v_user
  ) then
    raise exception 'NOT_PARTICIPANT';
  end if;

  delete from public.participations where pique_id = p_pique and user_id = v_user;
  insert into public.ledger_entries (user_id, amount, kind, playground_id, pique_id)
  values (v_user, v_pique.stake, 'stake_refund', v_pique.playground_id, p_pique);

  select count(*) into v_remaining from public.participations where pique_id = p_pique;
  if v_remaining = 0 then
    update public.piques
    set status = 'cancelled', updated_at = now()
    where id = p_pique;
  end if;
end;
$$;

create function public.propose_pique_result(p_pique uuid, p_option uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pique public.piques%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  perform public.sync_piques();
  select * into v_pique from public.piques where id = p_pique for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_pique.status <> 'locked' then raise exception 'PIQUE_CLOSED'; end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = v_pique.playground_id and user_id = v_user and role = 'admin'
  ) then
    raise exception 'NOT_ADMIN';
  end if;
  if not exists (
    select 1 from public.pique_options where id = p_option and pique_id = p_pique
  ) then
    raise exception 'INVALID_OPTION';
  end if;

  insert into public.result_proposals (pique_id, option_id, proposed_by, voting_ends_at)
  values (p_pique, p_option, v_user, now() + interval '48 hours');
  update public.piques
  set status = 'pending_result', updated_at = now()
  where id = p_pique;
  perform public.notify_members(
    v_pique.playground_id,
    v_user,
    'Vota el resultado de: ' || v_pique.question
  );
end;
$$;

create function public.vote_pique_result(
  p_pique uuid,
  p_decision public.vote_decision,
  p_suggested uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pique public.piques%rowtype;
  v_proposal public.result_proposals%rowtype;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_pique from public.piques where id = p_pique for update;
  if not found or v_pique.status <> 'pending_result' then
    raise exception 'PIQUE_CLOSED';
  end if;
  select * into v_proposal from public.result_proposals where pique_id = p_pique;
  if v_proposal.voting_ends_at <= now() then
    perform public.resolve_pique(p_pique);
    raise exception 'VOTING_CLOSED';
  end if;
  if not exists (
    select 1 from public.participations
    where pique_id = p_pique and user_id = v_user
  ) then
    raise exception 'NOT_PARTICIPANT';
  end if;
  if v_user = v_proposal.proposed_by then
    raise exception 'INVALID_INPUT';
  end if;
  if p_decision = 'reject' and p_suggested is null then
    raise exception 'SUGGESTION_REQUIRED';
  end if;
  if p_suggested is not null and not exists (
    select 1 from public.pique_options where id = p_suggested and pique_id = p_pique
  ) then
    raise exception 'INVALID_OPTION';
  end if;

  insert into public.result_votes (pique_id, user_id, decision, suggested_option_id)
  values (
    p_pique,
    v_user,
    p_decision,
    case when p_decision = 'reject' then p_suggested else null end
  );
  perform public.resolve_pique(p_pique);
end;
$$;

create function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

revoke all on function public.prevent_ledger_mutation() from public, anon, authenticated;
revoke all on function public.participant_key(uuid[]) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.notify_members(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.resolve_pique(uuid) from public, anon, authenticated;
revoke all on function public.is_playground_member(uuid) from public, anon;
revoke all on function public.is_playground_admin(uuid) from public, anon;
revoke all on function public.sync_piques() from public, anon;
revoke all on function public.my_balance() from public, anon;
revoke all on function public.create_playground(text, text, text) from public, anon;
revoke all on function public.invite_to_playground(uuid, text) from public, anon;
revoke all on function public.respond_to_invitation(uuid, boolean) from public, anon;
revoke all on function public.request_playground_access(text) from public, anon;
revoke all on function public.respond_to_join_request(uuid, boolean) from public, anon;
revoke all on function public.create_pique(uuid, text, text, public.pique_kind, integer, timestamptz, text[], boolean) from public, anon;
revoke all on function public.add_pique_option(uuid, text) from public, anon;
revoke all on function public.join_pique(uuid, uuid) from public, anon;
revoke all on function public.leave_pique(uuid) from public, anon;
revoke all on function public.propose_pique_result(uuid, uuid) from public, anon;
revoke all on function public.vote_pique_result(uuid, public.vote_decision, uuid) from public, anon;
revoke all on function public.mark_notifications_read() from public, anon;

revoke all on all tables in schema public from anon, authenticated;
grant select on
  public.profiles,
  public.playgrounds,
  public.playground_members,
  public.invitations,
  public.join_requests,
  public.piques,
  public.pique_options,
  public.participations,
  public.result_proposals,
  public.result_votes,
  public.pique_winners,
  public.residuals,
  public.ledger_entries,
  public.notifications
to authenticated;
grant update (display_name) on public.profiles to authenticated;

grant execute on function public.is_playground_member(uuid) to authenticated;
grant execute on function public.is_playground_admin(uuid) to authenticated;
grant execute on function public.sync_piques() to authenticated;
grant execute on function public.my_balance() to authenticated;
grant execute on function public.create_playground(text, text, text) to authenticated;
grant execute on function public.invite_to_playground(uuid, text) to authenticated;
grant execute on function public.respond_to_invitation(uuid, boolean) to authenticated;
grant execute on function public.request_playground_access(text) to authenticated;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;
grant execute on function public.create_pique(uuid, text, text, public.pique_kind, integer, timestamptz, text[], boolean) to authenticated;
grant execute on function public.add_pique_option(uuid, text) to authenticated;
grant execute on function public.join_pique(uuid, uuid) to authenticated;
grant execute on function public.leave_pique(uuid) to authenticated;
grant execute on function public.propose_pique_result(uuid, uuid) to authenticated;
grant execute on function public.vote_pique_result(uuid, public.vote_decision, uuid) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;

alter table public.profiles enable row level security;
alter table public.playgrounds enable row level security;
alter table public.playground_members enable row level security;
alter table public.invitations enable row level security;
alter table public.join_requests enable row level security;
alter table public.piques enable row level security;
alter table public.pique_options enable row level security;
alter table public.participations enable row level security;
alter table public.result_proposals enable row level security;
alter table public.result_votes enable row level security;
alter table public.pique_winners enable row level security;
alter table public.residuals enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.notifications enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.playground_members mine
      join public.playground_members theirs
        on mine.playground_id = theirs.playground_id
      where mine.user_id = (select auth.uid())
        and theirs.user_id = profiles.id
    )
    or exists (
      select 1 from public.invitations i
      where i.status = 'pending'
        and (
          (i.invitee_id = (select auth.uid()) and i.inviter_id = profiles.id)
          or (public.is_playground_admin(i.playground_id) and i.invitee_id = profiles.id)
        )
    )
    or exists (
      select 1 from public.join_requests r
      where r.status = 'pending'
        and r.user_id = profiles.id
        and public.is_playground_admin(r.playground_id)
    )
  );
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy playgrounds_select on public.playgrounds
  for select to authenticated
  using (
    public.is_playground_member(id)
    or public.is_playground_admin(id)
    or exists (
      select 1 from public.invitations i
      where i.playground_id = playgrounds.id
        and i.invitee_id = (select auth.uid())
        and i.status = 'pending'
    )
    or exists (
      select 1 from public.join_requests r
      where r.playground_id = playgrounds.id
        and r.user_id = (select auth.uid())
        and r.status = 'pending'
    )
  );

create policy members_select on public.playground_members
  for select to authenticated
  using (public.is_playground_member(playground_id));

create policy invitations_select on public.invitations
  for select to authenticated
  using (
    invitee_id = (select auth.uid())
    or public.is_playground_admin(playground_id)
  );

create policy requests_select on public.join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_playground_admin(playground_id)
  );

create policy piques_select on public.piques
  for select to authenticated
  using (public.is_playground_member(playground_id));

create policy options_select on public.pique_options
  for select to authenticated
  using (
    exists (
      select 1 from public.piques p
      where p.id = pique_options.pique_id
        and public.is_playground_member(p.playground_id)
    )
  );

create policy participations_select on public.participations
  for select to authenticated
  using (
    exists (
      select 1 from public.piques p
      where p.id = participations.pique_id
        and public.is_playground_member(p.playground_id)
    )
  );

create policy proposals_select on public.result_proposals
  for select to authenticated
  using (
    exists (
      select 1 from public.piques p
      where p.id = result_proposals.pique_id
        and public.is_playground_member(p.playground_id)
    )
  );

create policy votes_select on public.result_votes
  for select to authenticated
  using (
    exists (
      select 1 from public.piques p
      where p.id = result_votes.pique_id
        and public.is_playground_member(p.playground_id)
    )
  );

create policy winners_select on public.pique_winners
  for select to authenticated
  using (
    exists (
      select 1 from public.piques p
      where p.id = pique_winners.pique_id
        and public.is_playground_member(p.playground_id)
    )
  );

create policy residuals_select on public.residuals
  for select to authenticated
  using (public.is_playground_member(playground_id));

create policy ledger_select on public.ledger_entries
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      playground_id is not null
      and public.is_playground_member(playground_id)
    )
  );

create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
