-- Standing invite link per playground. Domain: invitations stay open.

alter table public.playgrounds
  add column invite_token uuid not null unique default gen_random_uuid();
