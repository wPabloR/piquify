-- Transactional abuse checks for the two-account cycle.
-- Run as one script. ROLLBACK drops every fixture, including the test users.

begin;

create or replace function pg_temp.assume(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function pg_temp.expect_error(p_sql text, p_code text)
returns void
language plpgsql
as $$
begin
  execute p_sql;
  raise exception 'expected %', p_code;
exception when others then
  if sqlerrm is distinct from p_code then
    raise;
  end if;
end;
$$;

do $test$
declare
  v_admin uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
  v_playground uuid;
  v_code text;
  v_invitation uuid;
  v_request uuid;
  v_pique uuid;
  v_option_a uuid;
  v_option_b uuid;
  v_rich uuid;
  v_rich_option uuid;
  v_pool uuid;
  v_pool_a uuid;
  v_pool_b uuid;
  v_same uuid;
  v_same_option uuid;
  v_solo uuid;
  v_solo_option uuid;
  v_cancel uuid;
  v_cancel_option uuid;
  v_balance integer;
  v_status public.pique_status;
  v_visible integer;
  v_admin_notes integer;
  v_guest_notes integer;
  v_payouts integer;
  v_residual integer;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_admin, 'authenticated', 'authenticated',
      v_admin::text || '@piquify.test', extensions.crypt('piquify-local-1', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Ana Admin', 'handle', 'anaadmin'),
      now(), now(), '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_guest, 'authenticated', 'authenticated',
      v_guest::text || '@piquify.test', extensions.crypt('piquify-local-1', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'Luis Invitado', 'handle', 'luisguest'),
      now(), now(), '', '', '', ''
    );

  assert public.playground_emoji('Piso del mar') = '🌊', 'emoji hash drifted';
  assert (select sum(amount) from public.ledger_entries where user_id = v_guest) = 200, 'opening balance';

  perform pg_temp.assume(v_admin);
  v_playground := public.create_playground('Piso del mar', 'Porra de casa');
  select public_code into v_code from public.playgrounds where id = v_playground;
  assert (select emoji from public.playgrounds where id = v_playground) = '🌊', 'stored emoji';

  perform pg_temp.assume(v_guest);
  perform pg_temp.expect_error(
    format(
      'select public.create_pique(%L, %L, null, %L, 20, now() + interval ''1 day'', array[''Ana'', ''Luis''])',
      v_playground, '¿Quién gana?', 'options'
    ),
    'NOT_ADMIN'
  );

  perform pg_temp.assume(v_admin);
  perform pg_temp.expect_error(
    format(
      'select public.create_pique(%L, %L, null, %L, 10, now() + interval ''1 day'', array[''mañana'', ''2026-10-20''])',
      v_playground, 'Fecha mala', 'date'
    ),
    'INVALID_INPUT'
  );
  perform pg_temp.expect_error(
    format(
      'select public.create_pique(%L, %L, null, %L, 10, now() + interval ''1 day'', array[''1.5'', ''2''])',
      v_playground, 'Numero malo', 'number'
    ),
    'INVALID_INPUT'
  );

  perform public.create_pique(
    v_playground, '¿Qué día?', null, 'date', 10, now() + interval '1 day',
    array['2026-10-20', '2024-02-29']
  );
  perform public.create_pique(
    v_playground, '¿Cuántos?', null, 'number', 10, now() + interval '1 day',
    array['007', '-3']
  );
  assert exists (
    select 1 from public.pique_options o
    join public.piques p on p.id = o.pique_id
    where p.question = '¿Cuántos?' and o.label = '7'
  ), 'number was not canonicalized';

  v_pique := public.create_pique(
    v_playground, '¿Quién llega?', null, 'options', 80, now() + interval '1 day',
    array['Ana', 'Luis']
  );
  select id into v_option_a from public.pique_options where pique_id = v_pique and label = 'Ana';
  select id into v_option_b from public.pique_options where pique_id = v_pique and label = 'Luis';
  v_cancel := public.create_pique(
    v_playground, 'Se cancela', null, 'options', 10, now() + interval '1 day',
    array['A', 'B']
  );
  select id into v_cancel_option from public.pique_options where pique_id = v_cancel and label = 'A';

  perform pg_temp.assume(v_guest);
  perform pg_temp.expect_error(
    format('select public.add_pique_option(%L, %L)', v_pique, 'otra'),
    'PIQUE_CLOSED'
  );
  perform pg_temp.expect_error(
    format('select public.join_pique(%L, %L)', v_pique, v_option_a),
    'NOT_A_MEMBER'
  );

  perform set_config('request.jwt.claim.sub', v_guest::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_guest, 'role', 'authenticated')::text,
    true
  );
  set local role authenticated;
  select count(*) into v_visible from public.piques where playground_id = v_playground;
  assert v_visible = 0, 'pending outsider can read piques';
  reset role;

  perform pg_temp.assume(v_admin);
  v_invitation := public.invite_to_playground(v_playground, 'luisguest');
  perform pg_temp.assume(v_guest);
  v_request := public.request_playground_access(v_code);

  reset role;
  select count(*) into v_admin_notes
  from public.notifications
  where user_id = v_admin and body = 'Hay una solicitud nueva para entrar.';
  select count(*) into v_guest_notes
  from public.notifications
  where user_id <> v_admin and body = 'Hay una solicitud nueva para entrar.';
  assert v_admin_notes = 1, 'admin was not notified';
  assert v_guest_notes = 0, 'join request notified someone other than the admin';

  perform pg_temp.assume(v_guest);
  perform pg_temp.expect_error(
    format('select public.respond_to_join_request(%L, true)', v_request),
    'NOT_ADMIN'
  );
  perform public.respond_to_invitation(v_invitation, true);

  reset role;
  assert exists (
    select 1 from public.playground_members
    where playground_id = v_playground and user_id = v_guest and role = 'member'
  ), 'accepted invitation did not grant membership';
  assert (
    select status from public.join_requests where id = v_request
  ) = 'declined', 'sibling request stayed pending';
  assert not exists (
    select 1 from public.notifications
    where user_id = v_guest and body = 'Tu solicitud fue rechazada.'
  ), 'closing the sibling request sent a rejection';

  perform pg_temp.assume(v_guest);
  perform public.join_pique(v_cancel, v_cancel_option);
  perform public.leave_pique(v_cancel);
  reset role;
  assert (select status from public.piques where id = v_cancel) = 'cancelled', 'last leave did not cancel';

  perform pg_temp.assume(v_admin);
  v_rich := public.create_pique(
    v_playground, 'Demasiado caro', null, 'options', 100000, now() + interval '1 day',
    array['A', 'B']
  );
  select id into v_rich_option from public.pique_options where pique_id = v_rich and label = 'A';
  perform pg_temp.assume(v_guest);
  perform pg_temp.expect_error(
    format('select public.join_pique(%L, %L)', v_rich, v_rich_option),
    'INSUFFICIENT_BALANCE'
  );

  perform pg_temp.assume(v_admin);
  perform public.join_pique(v_pique, v_option_a);
  perform pg_temp.assume(v_guest);
  perform public.join_pique(v_pique, v_option_a);
  perform public.join_pique(v_pique, v_option_b);
  reset role;
  assert (
    select count(*) from public.ledger_entries
    where user_id = v_guest and pique_id = v_pique and kind = 'stake_hold'
  ) = 1, 'changing option charged the stake twice';
  perform pg_temp.assume(v_guest);
  perform public.leave_pique(v_pique);
  perform public.join_pique(v_pique, v_option_b);

  reset role;
  select coalesce(sum(amount), 0) into v_balance
  from public.ledger_entries where user_id = v_guest;
  assert v_balance = 120, 'rejoin did not hold the stake again';
  assert (
    select count(*) from public.ledger_entries
    where user_id = v_guest and pique_id = v_pique and kind = 'stake_hold'
  ) = 2, 'second hold missing';

  perform pg_temp.assume(v_admin);
  update public.piques set closes_at = now() - interval '1 minute' where id = v_pique;
  perform public.sync_piques();
  select status into v_status from public.piques where id = v_pique;
  assert v_status = 'locked', 'deadline did not lock the pique';

  perform public.propose_pique_result(v_pique, v_option_a);
  select status into v_status from public.piques where id = v_pique;
  assert v_status = 'pending_result', 'sole proposer resolved before the other vote';

  perform pg_temp.assume(v_guest);
  perform public.vote_pique_result(v_pique, 'reject', null);
  perform pg_temp.expect_error(
    format('select public.vote_pique_result(%L, %L, null)', v_pique, 'approve'),
    'ALREADY_VOTED'
  );

  reset role;
  select status into v_status from public.piques where id = v_pique;
  assert v_status = 'resolved', 'full vote did not resolve immediately';
  assert (
    select option_id from public.pique_winners where pique_id = v_pique
  ) = v_option_a, 'reject without a suggestion changed the proposal';

  select count(*) into v_payouts
  from public.ledger_entries
  where pique_id = v_pique and kind = 'payout' and user_id = v_admin;
  assert v_payouts = 1, 'payout was not unique';
  perform public.resolve_pique(v_pique);
  select count(*) into v_payouts
  from public.ledger_entries
  where pique_id = v_pique and kind = 'payout';
  assert v_payouts = 1, 'resolving twice paid again';
  select amount into v_residual
  from public.residuals where source_pique_id = v_pique;
  assert v_residual is null, 'exact split left a residual';

  perform pg_temp.assume(v_admin);
  v_pool := public.create_pique(
    v_playground, 'Bote residual', null, 'options', 10, now() + interval '1 day',
    array['A', 'B']
  );
  select id into v_pool_a from public.pique_options where pique_id = v_pool and label = 'A';
  select id into v_pool_b from public.pique_options where pique_id = v_pool and label = 'B';
  perform public.join_pique(v_pool, v_pool_a);
  perform pg_temp.assume(v_guest);
  perform public.join_pique(v_pool, v_pool_a);
  perform pg_temp.assume(v_admin);
  update public.piques set closes_at = now() - interval '1 minute' where id = v_pool;
  perform public.sync_piques();
  perform public.propose_pique_result(v_pool, v_pool_b);
  perform pg_temp.assume(v_guest);
  perform public.vote_pique_result(v_pool, 'approve', null);
  reset role;
  select amount into v_residual from public.residuals where source_pique_id = v_pool;
  assert v_residual = 20, 'unclaimed pot did not stay as residual';

  perform pg_temp.assume(v_admin);
  v_solo := public.create_pique(
    v_playground, 'Solo admin', null, 'options', 10, now() + interval '1 day',
    array['A', 'B']
  );
  select id into v_solo_option from public.pique_options where pique_id = v_solo and label = 'A';
  perform public.join_pique(v_solo, v_solo_option);
  update public.piques set closes_at = now() - interval '1 minute' where id = v_solo;
  perform public.sync_piques();
  perform public.propose_pique_result(v_solo, v_solo_option);
  reset role;
  assert (select status from public.piques where id = v_solo) = 'resolved', 'sole participant did not resolve';
  assert (
    select consumed_by_pique_id from public.residuals where source_pique_id = v_pool
  ) is null, 'residual applied to a different participant set';

  perform pg_temp.assume(v_admin);
  v_same := public.create_pique(
    v_playground, 'Mismo conjunto', null, 'options', 10, now() + interval '1 day',
    array['A', 'B']
  );
  select id into v_same_option from public.pique_options where pique_id = v_same and label = 'A';
  perform public.join_pique(v_same, v_same_option);
  perform pg_temp.assume(v_guest);
  perform public.join_pique(v_same, v_same_option);
  perform pg_temp.assume(v_admin);
  update public.piques set closes_at = now() - interval '1 minute' where id = v_same;
  perform public.sync_piques();
  perform public.propose_pique_result(v_same, v_same_option);
  perform pg_temp.assume(v_guest);
  perform public.vote_pique_result(v_same, 'approve', null);
  reset role;
  assert (
    select consumed_by_pique_id from public.residuals where source_pique_id = v_pool
  ) = v_same, 'residual did not apply to the exact participant set';
  assert (
    select amount from public.ledger_entries
    where pique_id = v_same and kind = 'payout' and user_id = v_admin
  ) = 20, 'residual was not added to the next pot';

  perform set_config('request.jwt.claim.sub', v_guest::text, true);
  set local role authenticated;
  begin
    insert into public.ledger_entries (user_id, amount, kind)
    values (v_guest, 1, 'opening_balance');
    raise exception 'ledger-insert-allowed';
  exception when insufficient_privilege then
    null;
  end;
  reset role;

  perform pg_temp.assume(v_guest);
  assert exists (
    select 1 from public.search_playgrounds('Piso del mar') where id = v_playground and access = 'member'
  ), 'search did not return a member playground';
  assert (
    select count(*) from public.playground_events where playground_id = v_playground and kind = 'pique_created'
  ) > 0, 'history missed pique creation';
  perform pg_temp.expect_error(
    format('select public.add_pique_option(%L, %L)', v_pique, 'otra'),
    'PIQUE_CLOSED'
  );
end;
$test$;

rollback;
