drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists ledger_immutable on public.ledger_entries;
drop trigger if exists playground_events_no_update on public.playground_events;

drop policy if exists profiles_select on public.profiles;
drop policy if exists playgrounds_select on public.playgrounds;
drop policy if exists members_select on public.playground_members;
drop policy if exists invitations_select on public.invitations;
drop policy if exists requests_select on public.join_requests;
drop policy if exists piques_select on public.piques;
drop policy if exists options_select on public.pique_options;
drop policy if exists participations_select on public.participations;
drop policy if exists proposals_select on public.result_proposals;
drop policy if exists votes_select on public.result_votes;
drop policy if exists winners_select on public.pique_winners;
drop policy if exists residuals_select on public.residuals;
drop policy if exists ledger_select on public.ledger_entries;
drop policy if exists playground_events_select on public.playground_events;

create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.invitations i
      where i.status = 'pending'
        and (
          (i.invitee_id = (select auth.uid()) and i.inviter_id = profiles.id)
          or (
            i.invitee_id = profiles.id
            and exists (
              select 1 from public.playground_members adm
              where adm.playground_id = i.playground_id
                and adm.user_id = (select auth.uid())
                and adm.role = 'admin'
            )
          )
        )
    )
    or exists (
      select 1 from public.join_requests r
      where r.status = 'pending'
        and r.user_id = profiles.id
        and exists (
          select 1 from public.playground_members adm
          where adm.playground_id = r.playground_id
            and adm.user_id = (select auth.uid())
            and adm.role = 'admin'
        )
    )
  );

create policy playgrounds_select on public.playgrounds
  for select to authenticated
  using (
    exists (
      select 1 from public.playground_members m
      where m.playground_id = playgrounds.id
        and m.user_id = (select auth.uid())
    )
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
  using (user_id = (select auth.uid()));

create policy invitations_select on public.invitations
  for select to authenticated
  using (
    invitee_id = (select auth.uid())
    or exists (
      select 1 from public.playground_members m
      where m.playground_id = invitations.playground_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

create policy requests_select on public.join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.playground_members m
      where m.playground_id = join_requests.playground_id
        and m.user_id = (select auth.uid())
        and m.role = 'admin'
    )
  );

create policy piques_select on public.piques
  for select to authenticated
  using (
    exists (
      select 1 from public.playground_members m
      where m.playground_id = piques.playground_id
        and m.user_id = (select auth.uid())
    )
  );

create policy options_select on public.pique_options
  for select to authenticated
  using (
    exists (
      select 1
      from public.piques p
      join public.playground_members m
        on m.playground_id = p.playground_id
       and m.user_id = (select auth.uid())
      where p.id = pique_options.pique_id
    )
  );

create policy participations_select on public.participations
  for select to authenticated
  using (
    exists (
      select 1
      from public.piques p
      join public.playground_members m
        on m.playground_id = p.playground_id
       and m.user_id = (select auth.uid())
      where p.id = participations.pique_id
    )
  );

create policy proposals_select on public.result_proposals
  for select to authenticated
  using (
    exists (
      select 1
      from public.piques p
      join public.playground_members m
        on m.playground_id = p.playground_id
       and m.user_id = (select auth.uid())
      where p.id = result_proposals.pique_id
    )
  );

create policy votes_select on public.result_votes
  for select to authenticated
  using (
    exists (
      select 1
      from public.piques p
      join public.playground_members m
        on m.playground_id = p.playground_id
       and m.user_id = (select auth.uid())
      where p.id = result_votes.pique_id
    )
  );

create policy winners_select on public.pique_winners
  for select to authenticated
  using (
    exists (
      select 1
      from public.piques p
      join public.playground_members m
        on m.playground_id = p.playground_id
       and m.user_id = (select auth.uid())
      where p.id = pique_winners.pique_id
    )
  );

create policy residuals_select on public.residuals
  for select to authenticated
  using (
    exists (
      select 1 from public.playground_members m
      where m.playground_id = residuals.playground_id
        and m.user_id = (select auth.uid())
    )
  );

create policy ledger_select on public.ledger_entries
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      playground_id is not null
      and exists (
        select 1 from public.playground_members m
        where m.playground_id = ledger_entries.playground_id
          and m.user_id = (select auth.uid())
      )
    )
  );

create policy playground_events_select on public.playground_events
  for select to authenticated
  using (
    exists (
      select 1 from public.playground_members m
      where m.playground_id = playground_events.playground_id
        and m.user_id = (select auth.uid())
    )
  );

drop function if exists public.handle_new_user();
drop function if exists public.my_balance();
drop function if exists public.is_playground_member(uuid);
drop function if exists public.is_playground_admin(uuid);
drop function if exists public.prevent_ledger_mutation();
drop function if exists public.playground_events_immutable();
drop function if exists public.participant_key(uuid[]);
drop function if exists public.notify_members(uuid, uuid, text);
drop function if exists public.notify_members(uuid, uuid, text, public.notification_kind, uuid);
drop function if exists public.record_playground_event(uuid, uuid, public.playground_event_kind, uuid, uuid, integer);
