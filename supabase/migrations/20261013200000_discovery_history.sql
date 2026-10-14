create type public.notification_kind as enum (
  'invitation',
  'join_request',
  'join_decision',
  'membership',
  'pique_opened',
  'participation',
  'vote_open',
  'resolved'
);

create type public.playground_event_kind as enum (
  'member_joined',
  'pique_created',
  'pique_joined',
  'option_changed',
  'pique_left',
  'pique_cancelled',
  'pique_locked',
  'result_proposed',
  'result_voted',
  'pique_resolved',
  'stake_hold',
  'stake_refund',
  'payout'
);

alter table public.notifications
  add column if not exists kind public.notification_kind,
  add column if not exists pique_id uuid references public.piques(id) on delete cascade;

create table public.playground_events (
  id uuid primary key default gen_random_uuid(),
  playground_id uuid not null references public.playgrounds(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  subject_user_id uuid references public.profiles(id) on delete set null,
  pique_id uuid references public.piques(id) on delete cascade,
  kind public.playground_event_kind not null,
  amount integer,
  created_at timestamptz not null default now()
);

create index playground_events_recent on public.playground_events (playground_id, created_at desc);

create function public.playground_events_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'LEDGER_IMMUTABLE';
end;
$$;

create trigger playground_events_no_update
  before update or delete on public.playground_events
  for each row execute function public.playground_events_immutable();

alter table public.playground_events enable row level security;

create policy playground_events_select on public.playground_events
  for select to authenticated
  using (public.is_playground_member(playground_id));

grant select on public.playground_events to authenticated;

create or replace function public.record_playground_event(
  p_playground uuid,
  p_actor uuid,
  p_kind public.playground_event_kind,
  p_pique uuid default null,
  p_subject uuid default null,
  p_amount integer default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.playground_events (
    playground_id, actor_id, subject_user_id, pique_id, kind, amount
  ) values (
    p_playground, p_actor, p_subject, p_pique, p_kind, p_amount
  );
  update public.playgrounds set updated_at = now() where id = p_playground;
end;
$$;

create or replace function public.notify_members(
  p_playground uuid,
  p_actor uuid,
  p_body text,
  p_kind public.notification_kind default 'membership',
  p_pique uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, playground_id, actor_id, body, kind, pique_id)
  select user_id, p_playground, p_actor, left(p_body, 240), p_kind, p_pique
  from public.playground_members
  where playground_id = p_playground
    and user_id is distinct from p_actor;
  update public.playgrounds set updated_at = now() where id = p_playground;
end;
$$;

create or replace function public.search_playgrounds(p_query text)
returns table (
  id uuid,
  name text,
  tagline text,
  emoji text,
  access text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_needle text := lower(btrim(coalesce(p_query, '')));
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(v_needle) < 2 then
    return;
  end if;

  return query
  select
    p.id,
    p.name,
    p.tagline,
    p.emoji,
    case
      when exists (
        select 1 from public.playground_members m
        where m.playground_id = p.id and m.user_id = v_user
      ) then 'member'
      when exists (
        select 1 from public.join_requests r
        where r.playground_id = p.id and r.user_id = v_user and r.status = 'pending'
      ) then 'pending_request'
      else 'none'
    end as access
  from public.playgrounds p
  where lower(p.name) like '%' || v_needle || '%'
     or lower(p.tagline) like '%' || v_needle || '%'
  order by p.updated_at desc
  limit 20;
end;
$$;

create or replace function public.request_playground_access_by_id(p_playground uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select public_code into v_code from public.playgrounds where id = p_playground;
  if v_code is null then raise exception 'NOT_FOUND'; end if;
  return public.request_playground_access(v_code);
end;
$$;

create or replace function public.invite_to_playground(p_playground uuid, p_handle text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invitee uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if not exists (
    select 1 from public.playground_members
    where playground_id = p_playground and user_id = v_user and role = 'admin'
  ) then
    raise exception 'NOT_ADMIN';
  end if;

  select id into v_invitee from public.profiles where handle = lower(trim(p_handle));
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

  insert into public.notifications (user_id, playground_id, actor_id, body, kind)
  values (v_invitee, p_playground, v_user, 'Te han invitado a un playground.', 'invitation');
  return v_id;
end;
$$;

create or replace function public.respond_to_invitation(p_invitation uuid, p_accept boolean)
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

  if p_accept then
    update public.join_requests
    set status = 'declined'
    where playground_id = v_row.playground_id
      and user_id = v_user
      and status = 'pending';

    if not exists (
      select 1 from public.playground_members
      where playground_id = v_row.playground_id and user_id = v_user
    ) then
      insert into public.playground_members (playground_id, user_id, role)
      values (v_row.playground_id, v_user, 'member');
      perform public.record_playground_event(v_row.playground_id, v_user, 'member_joined', null, v_user);
      perform public.notify_members(v_row.playground_id, v_user, 'Hay una nueva incorporación.', 'membership');
    end if;
  end if;
end;
$$;

create or replace function public.request_playground_access(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_playground uuid;
  v_admin uuid;
  v_id uuid;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  select id, admin_id into v_playground, v_admin
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

  insert into public.notifications (user_id, playground_id, actor_id, body, kind)
  values (v_admin, v_playground, v_user, 'Hay una solicitud nueva para entrar.', 'join_request');
  return v_id;
end;
$$;

create or replace function public.respond_to_join_request(p_request uuid, p_accept boolean)
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

  if p_accept then
    update public.invitations
    set status = 'declined'
    where playground_id = v_row.playground_id
      and invitee_id = v_row.user_id
      and status = 'pending';

    if not exists (
      select 1 from public.playground_members
      where playground_id = v_row.playground_id and user_id = v_row.user_id
    ) then
      insert into public.playground_members (playground_id, user_id, role)
      values (v_row.playground_id, v_row.user_id, 'member');
      perform public.record_playground_event(v_row.playground_id, v_row.user_id, 'member_joined', null, v_row.user_id);
      perform public.notify_members(v_row.playground_id, v_row.user_id, 'Hay una nueva incorporación.', 'membership');
    end if;
  end if;

  insert into public.notifications (user_id, playground_id, actor_id, body, kind)
  values (
    v_row.user_id,
    v_row.playground_id,
    v_user,
    case when p_accept then 'Tu solicitud fue aceptada.' else 'Tu solicitud fue rechazada.' end,
    'join_decision'
  );
end;
$$;

drop function if exists public.create_pique(uuid, text, text, public.pique_kind, integer, timestamptz, text[], boolean);

create or replace function public.create_pique(
  p_playground uuid,
  p_question text,
  p_detail text,
  p_kind public.pique_kind,
  p_stake integer,
  p_closes_at timestamptz,
  p_options text[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_raw text;
  v_option text;
  v_position integer := 0;
  v_clean text[] := '{}';
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
  if char_length(btrim(regexp_replace(coalesce(p_question, ''), '\s+', ' ', 'g'))) not between 4 and 180 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_detail is not null and char_length(btrim(p_detail)) > 500 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_options is null then raise exception 'INVALID_INPUT'; end if;

  foreach v_raw in array p_options loop
    if btrim(coalesce(v_raw, '')) = '' then
      continue;
    end if;
    v_option := public.canonical_pique_option(p_kind, v_raw);
    if v_option is null then
      raise exception 'INVALID_INPUT';
    end if;
    v_clean := array_append(v_clean, v_option);
  end loop;

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
    btrim(regexp_replace(p_question, '\s+', ' ', 'g')),
    nullif(btrim(regexp_replace(coalesce(p_detail, ''), '\s+', ' ', 'g')), ''),
    p_kind,
    'open',
    p_stake,
    p_closes_at,
    v_user,
    false
  ) returning id into v_id;

  foreach v_option in array v_clean loop
    insert into public.pique_options (pique_id, label, position)
    values (v_id, v_option, v_position);
    v_position := v_position + 1;
  end loop;

  perform public.record_playground_event(p_playground, v_user, 'pique_created', v_id);
  perform public.notify_members(p_playground, v_user, 'Nuevo pique: ' || btrim(p_question), 'pique_opened', v_id);
  return v_id;
end;
$$;

create or replace function public.add_pique_option(p_pique uuid, p_label text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'PIQUE_CLOSED';
end;
$$;

update public.piques set allow_new_options = false where allow_new_options is distinct from false;

create or replace function public.join_pique(p_pique uuid, p_option uuid)
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
    perform public.record_playground_event(v_pique.playground_id, v_user, 'option_changed', p_pique);
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
  perform public.record_playground_event(v_pique.playground_id, v_user, 'pique_joined', p_pique);
  perform public.record_playground_event(v_pique.playground_id, v_user, 'stake_hold', p_pique, v_user, -v_pique.stake);
  perform public.notify_members(
    v_pique.playground_id,
    v_user,
    'Nueva participación en: ' || v_pique.question,
    'participation',
    p_pique
  );
end;
$$;

create or replace function public.leave_pique(p_pique uuid)
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
  perform public.record_playground_event(v_pique.playground_id, v_user, 'pique_left', p_pique);
  perform public.record_playground_event(v_pique.playground_id, v_user, 'stake_refund', p_pique, v_user, v_pique.stake);

  select count(*) into v_remaining from public.participations where pique_id = p_pique;
  if v_remaining = 0 then
    update public.piques
    set status = 'cancelled', updated_at = now()
    where id = p_pique;
    perform public.record_playground_event(v_pique.playground_id, v_user, 'pique_cancelled', p_pique);
  end if;
end;
$$;

create or replace function public.sync_piques()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_playground uuid;
  v_status public.pique_status;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  for v_id, v_playground, v_status in
    update public.piques p
    set status = case
        when (select count(*) from public.participations x where x.pique_id = p.id) = 0
          then 'cancelled'::public.pique_status
        else 'locked'::public.pique_status
      end,
      updated_at = now()
    where p.status = 'open'
      and p.closes_at <= now()
    returning p.id, p.playground_id, p.status
  loop
    perform public.record_playground_event(
      v_playground,
      null,
      case when v_status = 'cancelled' then 'pique_cancelled'::public.playground_event_kind else 'pique_locked'::public.playground_event_kind end,
      v_id
    );
  end loop;

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

create or replace function public.propose_pique_result(p_pique uuid, p_option uuid)
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
  perform public.record_playground_event(v_pique.playground_id, v_user, 'result_proposed', p_pique);
  perform public.notify_members(
    v_pique.playground_id,
    v_user,
    'Vota el resultado de: ' || v_pique.question,
    'vote_open',
    p_pique
  );
  perform public.resolve_pique(p_pique);
end;
$$;

create or replace function public.vote_pique_result(
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
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists (
    select 1 from public.result_votes
    where pique_id = p_pique and user_id = v_user
  ) then
    raise exception 'ALREADY_VOTED';
  end if;
  if v_pique.status <> 'pending_result' then
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
  if p_decision = 'reject' and p_suggested is not null and not exists (
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
  perform public.record_playground_event(v_pique.playground_id, v_user, 'result_voted', p_pique);
  perform public.resolve_pique(p_pique);
end;
$$;

create or replace function public.resolve_pique(p_pique_id uuid)
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
    insert into public.playground_events (playground_id, actor_id, subject_user_id, pique_id, kind, amount)
    select v_pique.playground_id, user_id, user_id, p_pique_id, 'payout', v_share
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

  perform public.record_playground_event(v_pique.playground_id, v_proposal.proposed_by, 'pique_resolved', p_pique_id);
  perform public.notify_members(
    v_pique.playground_id,
    v_proposal.proposed_by,
    'Resultado listo: ' || v_pique.question,
    'resolved',
    p_pique_id
  );
end;
$$;

insert into public.playground_events (playground_id, actor_id, subject_user_id, kind, created_at)
select playground_id, user_id, user_id, 'member_joined', created_at
from public.playground_members;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select playground_id, created_by, id, 'pique_created', created_at
from public.piques;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select q.playground_id, p.user_id, p.pique_id, 'pique_joined', p.created_at
from public.participations p
join public.piques q on q.id = p.pique_id;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select q.playground_id, r.proposed_by, r.pique_id, 'result_proposed', r.proposed_at
from public.result_proposals r
join public.piques q on q.id = r.pique_id;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select q.playground_id, v.user_id, v.pique_id, 'result_voted', v.created_at
from public.result_votes v
join public.piques q on q.id = v.pique_id;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select playground_id, created_by, id, 'pique_resolved', resolved_at
from public.piques
where status = 'resolved' and resolved_at is not null;

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select playground_id, created_by, id, 'pique_cancelled', updated_at
from public.piques
where status = 'cancelled';

insert into public.playground_events (playground_id, actor_id, pique_id, kind, created_at)
select playground_id, created_by, id, 'pique_locked', updated_at
from public.piques
where status in ('locked', 'pending_result');

insert into public.playground_events (playground_id, actor_id, subject_user_id, pique_id, kind, amount, created_at)
select playground_id, user_id, user_id, pique_id, kind::text::public.playground_event_kind, amount, created_at
from public.ledger_entries
where playground_id is not null
  and kind in ('stake_hold', 'stake_refund', 'payout');

update public.notifications
set kind = case
  when body like 'Te han invitado%' then 'invitation'::public.notification_kind
  when body like 'Hay una solicitud%' then 'join_request'::public.notification_kind
  when body like 'Tu solicitud%' then 'join_decision'::public.notification_kind
  when body like 'Hay una nueva incorporación%' then 'membership'::public.notification_kind
  when body like 'Nuevo pique:%' then 'pique_opened'::public.notification_kind
  when body like 'Nueva participación%' then 'participation'::public.notification_kind
  when body like 'Vota el resultado%' then 'vote_open'::public.notification_kind
  when body like 'Resultado listo:%' then 'resolved'::public.notification_kind
  else 'membership'::public.notification_kind
end
where kind is null;

update public.notifications n
set pique_id = q.id
from public.piques q
where n.pique_id is null
  and n.playground_id = q.playground_id
  and n.body like '%' || q.question || '%'
  and n.kind in ('pique_opened', 'participation', 'vote_open', 'resolved');

drop function if exists public.notify_members(uuid, uuid, text);
revoke all on function public.notify_members(uuid, uuid, text, public.notification_kind, uuid) from public, anon;
revoke all on function public.record_playground_event(uuid, uuid, public.playground_event_kind, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.search_playgrounds(text) from public, anon;
revoke all on function public.request_playground_access_by_id(uuid) from public, anon;
revoke all on function public.create_pique(uuid, text, text, public.pique_kind, integer, timestamptz, text[]) from public, anon;
revoke all on function public.resolve_pique(uuid) from public, anon, authenticated;

grant execute on function public.search_playgrounds(text) to authenticated;
grant execute on function public.request_playground_access_by_id(uuid) to authenticated;
grant execute on function public.create_pique(uuid, text, text, public.pique_kind, integer, timestamptz, text[]) to authenticated;
grant execute on function public.invite_to_playground(uuid, text) to authenticated;
grant execute on function public.respond_to_invitation(uuid, boolean) to authenticated;
grant execute on function public.request_playground_access(text) to authenticated;
grant execute on function public.respond_to_join_request(uuid, boolean) to authenticated;
grant execute on function public.add_pique_option(uuid, text) to authenticated;
grant execute on function public.join_pique(uuid, uuid) to authenticated;
grant execute on function public.leave_pique(uuid) to authenticated;
grant execute on function public.propose_pique_result(uuid, uuid) to authenticated;
grant execute on function public.vote_pique_result(uuid, public.vote_decision, uuid) to authenticated;
grant execute on function public.sync_piques() to authenticated;
