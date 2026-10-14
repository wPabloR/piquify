do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'piquify_app') then
    create role piquify_app login noinherit;
  end if;
end
$$;

grant usage on schema public to piquify_app;

grant select, insert on
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
  public.notifications,
  public.playground_events
to piquify_app;

grant update (display_name) on public.profiles to piquify_app;
grant update (updated_at) on public.playgrounds to piquify_app;
grant update (status) on public.invitations to piquify_app;
grant update (status) on public.join_requests to piquify_app;
grant update (status, updated_at, resolved_at) on public.piques to piquify_app;
grant update (option_id) on public.participations to piquify_app;
grant update (consumed_by_pique_id) on public.residuals to piquify_app;
grant update (read_at) on public.notifications to piquify_app;
grant delete on public.participations to piquify_app;

create policy piquify_app_profiles on public.profiles
  for all to piquify_app using (true) with check (true);
create policy piquify_app_playgrounds on public.playgrounds
  for all to piquify_app using (true) with check (true);
create policy piquify_app_members on public.playground_members
  for all to piquify_app using (true) with check (true);
create policy piquify_app_invitations on public.invitations
  for all to piquify_app using (true) with check (true);
create policy piquify_app_requests on public.join_requests
  for all to piquify_app using (true) with check (true);
create policy piquify_app_piques on public.piques
  for all to piquify_app using (true) with check (true);
create policy piquify_app_options on public.pique_options
  for all to piquify_app using (true) with check (true);
create policy piquify_app_participations on public.participations
  for all to piquify_app using (true) with check (true);
create policy piquify_app_proposals on public.result_proposals
  for all to piquify_app using (true) with check (true);
create policy piquify_app_votes on public.result_votes
  for all to piquify_app using (true) with check (true);
create policy piquify_app_winners on public.pique_winners
  for all to piquify_app using (true) with check (true);
create policy piquify_app_residuals on public.residuals
  for all to piquify_app using (true) with check (true);
create policy piquify_app_ledger on public.ledger_entries
  for all to piquify_app using (true) with check (true);
create policy piquify_app_notifications on public.notifications
  for all to piquify_app using (true) with check (true);
create policy piquify_app_events on public.playground_events
  for all to piquify_app using (true) with check (true);
