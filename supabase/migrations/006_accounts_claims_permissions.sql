-- FAI account claims and role-based staff permissions.
-- Run once in the Supabase SQL editor after the earlier FAI migrations.

begin;

alter table public.team_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

-- Normalize any historical free-form editor roles before enforcing the new set.
update public.team_members
set role = 'admin'
where lower(role) in ('editor', 'manager');

create table if not exists public.athlete_claims (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  athlete_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  note text,
  unique (team_id, athlete_id),
  unique (team_id, user_id),
  foreign key (team_id, athlete_id) references public.athletes(team_id, id) on delete cascade
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'coach', 'viewer')),
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (team_id, email)
);

create index if not exists athlete_claims_user_idx on public.athlete_claims(user_id);
create index if not exists athlete_claims_team_status_idx on public.athlete_claims(team_id, status);
create index if not exists team_invites_email_idx on public.team_invites(lower(email));

create or replace function public.fai_team_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select lower(tm.role)
  from public.team_members tm
  where tm.team_id = p_team_id and tm.user_id = auth.uid()
  limit 1
$$;

create or replace function public.fai_has_permission(p_team_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.team_members tm
      where tm.team_id = p_team_id
        and tm.user_id = auth.uid()
        and (
          lower(tm.role) in ('owner', 'admin')
          or (lower(tm.role) = 'coach' and coalesce((tm.permissions ->> p_permission)::boolean, false))
        )
    ),
    false
  )
$$;

create or replace function public.fai_claimed_athlete_id(p_team_id uuid default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ac.athlete_id
  from public.athlete_claims ac
  where ac.user_id = auth.uid()
    and ac.status = 'approved'
    and (p_team_id is null or ac.team_id = p_team_id)
  order by ac.reviewed_at desc nulls last
  limit 1
$$;

create or replace function public.request_athlete_claim(p_athlete_id text)
returns public.athlete_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_email text;
  v_claim public.athlete_claims;
begin
  if auth.uid() is null then
    raise exception 'Sign in before claiming an athlete profile.';
  end if;

  select a.team_id into v_team_id
  from public.athletes a
  where a.id = p_athlete_id
  order by a.team_id
  limit 1;

  if v_team_id is null then
    raise exception 'Athlete profile not found.';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.athlete_claims(team_id, athlete_id, user_id, email, status, requested_at)
  values (v_team_id, p_athlete_id, auth.uid(), v_email, 'pending', now())
  on conflict (team_id, user_id) do update
    set athlete_id = excluded.athlete_id,
        email = excluded.email,
        status = 'pending',
        requested_at = now(),
        reviewed_at = null,
        reviewed_by = null,
        note = null
  returning * into v_claim;

  return v_claim;
end;
$$;

create or replace function public.review_athlete_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_note text default null
)
returns public.athlete_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.athlete_claims;
begin
  select * into v_claim from public.athlete_claims where id = p_claim_id for update;
  if v_claim.id is null then raise exception 'Claim not found.'; end if;
  if not public.fai_has_permission(v_claim.team_id, 'staff') then
    raise exception 'Only an owner or administrator can review athlete claims.';
  end if;

  update public.athlete_claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_at = now(), reviewed_by = auth.uid(), note = p_note
  where id = p_claim_id
  returning * into v_claim;

  if p_approve then
    insert into public.team_members(team_id, user_id, role, permissions)
    values (v_claim.team_id, v_claim.user_id, 'athlete', '{}'::jsonb)
    on conflict (team_id, user_id) do update
      set role = 'athlete', permissions = '{}'::jsonb;
  end if;

  return v_claim;
end;
$$;

create or replace function public.accept_team_invite()
returns public.team_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_invite public.team_invites;
  v_member public.team_members;
begin
  if auth.uid() is null then raise exception 'Sign in before accepting an invitation.'; end if;
  select lower(email) into v_email from auth.users where id = auth.uid();

  select * into v_invite
  from public.team_invites
  where lower(email) = v_email and status = 'pending'
  order by created_at
  limit 1
  for update;

  if v_invite.id is null then raise exception 'No pending FAI team invitation matches this email.'; end if;

  insert into public.team_members(team_id, user_id, role, permissions)
  values (v_invite.team_id, auth.uid(), v_invite.role, v_invite.permissions)
  on conflict (team_id, user_id) do update
    set role = excluded.role, permissions = excluded.permissions
  returning * into v_member;

  update public.team_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
  return v_member;
end;
$$;

create or replace function public.update_my_athlete_profile(p_photo_url text, p_hudl_url text)
returns public.athletes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.athlete_claims;
  v_athlete public.athletes;
begin
  select * into v_claim
  from public.athlete_claims
  where user_id = auth.uid() and status = 'approved'
  order by reviewed_at desc nulls last
  limit 1;

  if v_claim.id is null then raise exception 'No approved athlete profile is linked to this account.'; end if;

  update public.athletes
  set photo_url = nullif(trim(p_photo_url), ''),
      hudl_url = nullif(trim(p_hudl_url), '')
  where team_id = v_claim.team_id and id = v_claim.athlete_id
  returning * into v_athlete;

  return v_athlete;
end;
$$;

grant execute on function public.request_athlete_claim(text) to authenticated;
grant execute on function public.review_athlete_claim(uuid, boolean, text) to authenticated;
grant execute on function public.accept_team_invite() to authenticated;
grant execute on function public.update_my_athlete_profile(text, text) to authenticated;
grant execute on function public.fai_team_role(uuid) to authenticated;
grant execute on function public.fai_has_permission(uuid, text) to authenticated;
grant execute on function public.fai_claimed_athlete_id(uuid) to authenticated;

alter table public.athlete_claims enable row level security;
alter table public.team_invites enable row level security;

-- Users can see their own claim. Owners/admins can see every claim for their team.
drop policy if exists athlete_claims_select on public.athlete_claims;
create policy athlete_claims_select on public.athlete_claims
for select to authenticated
using (user_id = auth.uid() or public.fai_has_permission(team_id, 'staff'));

-- Claims are submitted and reviewed through security-definer RPCs only.
drop policy if exists athlete_claims_no_direct_insert on public.athlete_claims;
create policy athlete_claims_no_direct_insert on public.athlete_claims
for insert to authenticated with check (false);

drop policy if exists athlete_claims_no_direct_update on public.athlete_claims;
create policy athlete_claims_no_direct_update on public.athlete_claims
for update to authenticated using (false);

-- Owners/admins manage staff invitations. Invitees may read their own pending invite.
drop policy if exists team_invites_select on public.team_invites;
create policy team_invites_select on public.team_invites
for select to authenticated
using (
  public.fai_has_permission(team_id, 'staff')
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists team_invites_insert on public.team_invites;
create policy team_invites_insert on public.team_invites
for insert to authenticated
with check (public.fai_has_permission(team_id, 'staff') and invited_by = auth.uid());

drop policy if exists team_invites_update on public.team_invites;
create policy team_invites_update on public.team_invites
for update to authenticated
using (public.fai_has_permission(team_id, 'staff'))
with check (public.fai_has_permission(team_id, 'staff'));

-- Replace broad member-write policies with capability-aware policies where these
-- policy names exist. The DROP statements are safe on databases with older names.
do $$
declare p record;
begin
  for p in select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('athletes','testing_events','test_sessions','play_events','film_plays')
      and cmd in ('INSERT','UPDATE','DELETE','ALL')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy athletes_staff_insert on public.athletes for insert to authenticated
with check (public.fai_has_permission(team_id, 'roster'));
create policy athletes_staff_update on public.athletes for update to authenticated
using (public.fai_has_permission(team_id, 'roster'))
with check (public.fai_has_permission(team_id, 'roster'));
create policy athletes_staff_delete on public.athletes for delete to authenticated
using (public.fai_has_permission(team_id, 'roster'));

create policy events_testing_write on public.testing_events for all to authenticated
using (public.fai_has_permission(team_id, 'testing'))
with check (public.fai_has_permission(team_id, 'testing'));
create policy sessions_testing_write on public.test_sessions for all to authenticated
using (public.fai_has_permission(team_id, 'testing'))
with check (public.fai_has_permission(team_id, 'testing'));

create policy plays_awards_write on public.play_events for all to authenticated
using (public.fai_has_permission(team_id, 'awards'))
with check (public.fai_has_permission(team_id, 'awards'));
create policy film_staff_write on public.film_plays for all to authenticated
using (public.fai_has_permission(team_id, 'film'))
with check (public.fai_has_permission(team_id, 'film'));

commit;
