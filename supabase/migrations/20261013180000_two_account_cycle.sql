-- Two-account cycle: deterministic emoji, typed options, access convergence,
-- rejoin, and a single vote that can resolve immediately.

drop index if exists public.ledger_one_hold;
drop index if exists public.ledger_one_refund;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select rel.relname as table_name, con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname in ('invitations', 'join_requests')
      and con.contype = 'u'
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      v_constraint.table_name,
      v_constraint.conname
    );
  end loop;
end $$;

create unique index if not exists invitations_one_pending
  on public.invitations (playground_id, invitee_id)
  where status = 'pending';

create unique index if not exists join_requests_one_pending
  on public.join_requests (playground_id, user_id)
  where status = 'pending';

create or replace function public.playground_emoji(p_name text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_name text := lower(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
  v_hash integer := (-2128831035);
  v_index integer := 1;
  v_code integer;
  v_product bigint;
  v_emojis text[] := array['🐚', '🌊', '🌴', '🏖️', '🐠', '⚓', '🌅', '🥥'];
begin
  while v_index <= char_length(v_name) loop
    v_code := ascii(substr(v_name, v_index, 1));
    v_hash := v_hash # v_code;
    v_product := (v_hash::bigint * 16777619) & 4294967295;
    if v_product >= 2147483648 then
      v_hash := (v_product - 4294967296)::integer;
    else
      v_hash := v_product::integer;
    end if;
    v_index := v_index + 1;
  end loop;

  return v_emojis[(((v_hash::bigint & 4294967295) % 8) + 1)::integer];
end;
$$;

create or replace function public.canonical_pique_option(
  p_kind public.pique_kind,
  p_value text
) returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_text text := btrim(regexp_replace(coalesce(p_value, ''), '\s+', ' ', 'g'));
  v_date date;
  v_number numeric;
begin
  if p_kind = 'options' then
    if char_length(v_text) between 1 and 80 then
      return v_text;
    end if;
    return null;
  end if;

  if p_kind = 'date' then
    if v_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      return null;
    end if;
    begin
      v_date := v_text::date;
    exception when others then
      return null;
    end;
    if to_char(v_date, 'YYYY-MM-DD') = v_text then
      return v_text;
    end if;
    return null;
  end if;

  if p_kind = 'number' then
    if v_text !~ '^-?[0-9]+$' then
      return null;
    end if;
    begin
      v_number := v_text::numeric;
    exception when others then
      return null;
    end;
    if v_number <> trunc(v_number)
      or v_number > 9007199254740991
      or v_number < -9007199254740991 then
      return null;
    end if;
    return trunc(v_number)::text;
  end if;

  return null;
end;
$$;

drop function if exists public.create_playground(text, text, text);

create function public.create_playground(
  p_name text,
  p_tagline text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_tagline text := btrim(regexp_replace(coalesce(p_tagline, ''), '\s+', ' ', 'g'));
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(v_name) not between 2 and 60 or char_length(v_tagline) > 140 then
    raise exception 'INVALID_INPUT';
  end if;

  insert into public.playgrounds (name, tagline, emoji, admin_id)
  values (v_name, v_tagline, public.playground_emoji(v_name), v_user)
  returning id into v_id;

  insert into public.playground_members (playground_id, user_id, role)
  values (v_id, v_user, 'admin');
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
      perform public.notify_members(v_row.playground_id, v_user, 'Hay una nueva incorporación.');
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

  insert into public.notifications (user_id, playground_id, actor_id, body)
  values (v_admin, v_playground, v_user, 'Hay una solicitud nueva para entrar.');
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
    end if;
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

create or replace function public.create_pique(
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
    coalesce(p_allow_new_options, false)
  ) returning id into v_id;

  foreach v_option in array v_clean loop
    insert into public.pique_options (pique_id, label, position)
    values (v_id, v_option, v_position);
    v_position := v_position + 1;
  end loop;

  perform public.notify_members(p_playground, v_user, 'Nuevo pique: ' || btrim(p_question));
  return v_id;
end;
$$;

create or replace function public.add_pique_option(p_pique uuid, p_label text)
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
  v_label text;
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

  v_label := public.canonical_pique_option(v_pique.kind, p_label);
  if v_label is null then raise exception 'INVALID_INPUT'; end if;
  if exists (
    select 1 from public.pique_options
    where pique_id = p_pique and lower(label) = lower(v_label)
  ) then
    raise exception 'INVALID_INPUT';
  end if;

  select coalesce(max(position) + 1, 0) into v_position
  from public.pique_options where pique_id = p_pique;
  if v_position > 11 then raise exception 'INVALID_INPUT'; end if;

  insert into public.pique_options (pique_id, label, position)
  values (p_pique, v_label, v_position)
  returning id into v_id;
  return v_id;
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
  perform public.notify_members(
    v_pique.playground_id,
    v_user,
    'Vota el resultado de: ' || v_pique.question
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
  perform public.resolve_pique(p_pique);
end;
$$;

revoke all on function public.playground_emoji(text) from public, anon, authenticated;
revoke all on function public.canonical_pique_option(public.pique_kind, text) from public, anon, authenticated;
revoke all on function public.create_playground(text, text) from public, anon;
grant execute on function public.create_playground(text, text) to authenticated;
