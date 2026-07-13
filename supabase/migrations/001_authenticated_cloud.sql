-- FAI authenticated cloud persistence
-- Run in a fresh Supabase project. No anonymous data policies are created.

begin;

create extension if not exists pgcrypto;

create table if not exists public.fai_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.fai_team_members (
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'coach', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.fai_team_invites (
  token uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  role text not null default 'coach' check (role in ('admin', 'coach', 'viewer')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses integer not null default 1 check (max_uses between 1 and 100),
  uses integer not null default 0 check (uses >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.fai_athletes (
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  id text not null,
  name text not null,
  grade integer not null check (grade between 7 and 12),
  position text not null default 'ATH',
  position_group text not null default 'ATH' check (position_group in ('QB','RB','WR','TE','OL','DL','LB','DB','K/P','ATH')),
  height_in numeric not null default 0 check (height_in >= 0 and height_in <= 100),
  weight_lbs numeric not null default 0 check (weight_lbs >= 0 and weight_lbs <= 700),
  photo_url text,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (team_id, id)
);

create table if not exists public.fai_testing_events (
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  id text not null,
  name text not null,
  phase text not null check (phase in ('Baseline','Midpoint','Final','Offseason','Summer','Preseason')),
  start_date date not null,
  end_date date,
  status text check (status is null or status in ('open','closed')),
  source_created_at timestamptz,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (team_id, id),
  check (end_date is null or end_date >= start_date)
);

create table if not exists public.fai_test_sessions (
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  id text not null,
  athlete_id text not null,
  event_id text not null,
  test_date date not null,
  phase text not null check (phase in ('Baseline','Midpoint','Final','Offseason','Summer','Preseason')),
  source_created_at timestamptz,
  grade_snapshot integer,
  position_snapshot text,
  position_group_snapshot text,
  weight_lbs_snapshot numeric,
  bench_max numeric,
  dash40_1 numeric,
  dash40_2 numeric,
  fly10_1 numeric,
  fly10_2 numeric,
  hang_clean_reps numeric,
  shuttle20_1 numeric,
  shuttle20_2 numeric,
  lat_shuttle_1 numeric,
  lat_shuttle_2 numeric,
  illinois numeric,
  squat_max numeric,
  broad_jump numeric,
  vertical_jump numeric,
  cond51015 numeric,
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (team_id, id),
  foreign key (team_id, athlete_id) references public.fai_athletes(team_id, id),
  foreign key (team_id, event_id) references public.fai_testing_events(team_id, id)
);

create table if not exists public.fai_audit_log (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.fai_teams(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  entity text not null check (entity in ('athlete','event','session')),
  record_id text not null,
  operation text not null check (operation in ('insert','update','delete','restore')),
  old_version integer,
  new_version integer,
  changed_at timestamptz not null default now()
);

create index if not exists fai_members_user_idx on public.fai_team_members(user_id);
create index if not exists fai_athletes_active_idx on public.fai_athletes(team_id) where deleted_at is null;
create index if not exists fai_events_active_idx on public.fai_testing_events(team_id, start_date desc) where deleted_at is null;
create index if not exists fai_sessions_active_idx on public.fai_test_sessions(team_id, event_id, athlete_id) where deleted_at is null;
create index if not exists fai_audit_team_idx on public.fai_audit_log(team_id, changed_at desc);

create or replace function public.fai_role(p_team_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.fai_team_members
  where team_id = p_team_id and user_id = auth.uid();
$$;

create or replace function public.fai_is_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.fai_team_members
    where team_id = p_team_id and user_id = auth.uid()
  );
$$;

create or replace function public.fai_can_edit(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.fai_role(p_team_id) in ('owner','admin','coach'), false);
$$;

create or replace function public.fai_is_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.fai_role(p_team_id) in ('owner','admin'), false);
$$;

alter table public.fai_teams enable row level security;
alter table public.fai_team_members enable row level security;
alter table public.fai_team_invites enable row level security;
alter table public.fai_athletes enable row level security;
alter table public.fai_testing_events enable row level security;
alter table public.fai_test_sessions enable row level security;
alter table public.fai_audit_log enable row level security;

-- Team and membership visibility.
drop policy if exists fai_teams_select on public.fai_teams;
create policy fai_teams_select on public.fai_teams for select to authenticated
using (public.fai_is_member(id));

drop policy if exists fai_teams_update on public.fai_teams;
create policy fai_teams_update on public.fai_teams for update to authenticated
using (public.fai_is_admin(id)) with check (public.fai_is_admin(id));

drop policy if exists fai_members_select on public.fai_team_members;
create policy fai_members_select on public.fai_team_members for select to authenticated
using (public.fai_is_member(team_id));

drop policy if exists fai_invites_select on public.fai_team_invites;
create policy fai_invites_select on public.fai_team_invites for select to authenticated
using (public.fai_is_admin(team_id));

-- Team data: members may read; non-viewer staff may write.
drop policy if exists fai_athletes_select on public.fai_athletes;
create policy fai_athletes_select on public.fai_athletes for select to authenticated
using (public.fai_is_member(team_id));
drop policy if exists fai_athletes_write on public.fai_athletes;
create policy fai_athletes_write on public.fai_athletes for all to authenticated
using (public.fai_can_edit(team_id)) with check (public.fai_can_edit(team_id));

drop policy if exists fai_events_select on public.fai_testing_events;
create policy fai_events_select on public.fai_testing_events for select to authenticated
using (public.fai_is_member(team_id));
drop policy if exists fai_events_write on public.fai_testing_events;
create policy fai_events_write on public.fai_testing_events for all to authenticated
using (public.fai_can_edit(team_id)) with check (public.fai_can_edit(team_id));

drop policy if exists fai_sessions_select on public.fai_test_sessions;
create policy fai_sessions_select on public.fai_test_sessions for select to authenticated
using (public.fai_is_member(team_id));
drop policy if exists fai_sessions_write on public.fai_test_sessions;
create policy fai_sessions_write on public.fai_test_sessions for all to authenticated
using (public.fai_can_edit(team_id)) with check (public.fai_can_edit(team_id));

drop policy if exists fai_audit_select on public.fai_audit_log;
create policy fai_audit_select on public.fai_audit_log for select to authenticated
using (public.fai_is_admin(team_id));

create or replace function public.create_fai_team(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_team uuid;
  v_base text;
  v_slug text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'Team name is too short'; end if;
  v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 2 then v_base := 'team'; end if;
  v_slug := left(v_base, 48) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into public.fai_teams(name, slug, created_by)
  values (trim(p_name), v_slug, v_user)
  returning id into v_team;
  insert into public.fai_team_members(team_id, user_id, role)
  values (v_team, v_user, 'owner');
  return v_team;
end;
$$;

create or replace function public.create_fai_invite(
  p_team_id uuid,
  p_role text default 'coach',
  p_expires_hours integer default 168,
  p_max_uses integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid;
begin
  if not public.fai_is_admin(p_team_id) then raise exception 'Admin access required'; end if;
  if p_role not in ('admin','coach','viewer') then raise exception 'Invalid role'; end if;
  insert into public.fai_team_invites(team_id, role, expires_at, max_uses, created_by)
  values (p_team_id, p_role, now() + make_interval(hours => greatest(1, least(p_expires_hours, 720))), greatest(1, least(p_max_uses, 100)), auth.uid())
  returning token into v_token;
  return v_token;
end;
$$;

create or replace function public.join_fai_team(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_invite public.fai_team_invites%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_invite from public.fai_team_invites
  where token = p_token for update;
  if not found then raise exception 'Invite not found'; end if;
  if v_invite.expires_at <= now() then raise exception 'Invite expired'; end if;
  if v_invite.uses >= v_invite.max_uses then raise exception 'Invite has no remaining uses'; end if;
  insert into public.fai_team_members(team_id, user_id, role)
  values (v_invite.team_id, v_user, v_invite.role)
  on conflict (team_id, user_id) do update set role = excluded.role;
  update public.fai_team_invites set uses = uses + 1 where token = p_token;
  return v_invite.team_id;
end;
$$;

-- One mutation endpoint keeps optimistic concurrency rules identical for every client.
create or replace function public.apply_fai_mutation(
  p_team_id uuid,
  p_entity text,
  p_operation text,
  p_record_id text,
  p_payload jsonb default '{}'::jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_current integer;
  v_new integer;
  v_row jsonb;
  v_audit_operation text;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'error', 'Authentication required'); end if;
  if not public.fai_can_edit(p_team_id) then return jsonb_build_object('ok', false, 'error', 'Write access required'); end if;
  if p_operation not in ('upsert','delete') then return jsonb_build_object('ok', false, 'error', 'Invalid operation'); end if;

  if p_entity = 'athlete' then
    select version into v_current from public.fai_athletes where team_id = p_team_id and id = p_record_id;
    if found and p_expected_version is distinct from v_current then
      select to_jsonb(a) into v_row from public.fai_athletes a where team_id = p_team_id and id = p_record_id;
      return jsonb_build_object('ok', false, 'conflict', true, 'remoteVersion', v_current, 'remoteRecord', v_row);
    end if;
    if p_operation = 'delete' then
      if not found then return jsonb_build_object('ok', true, 'version', 0); end if;
      update public.fai_athletes set deleted_at = now(), updated_at = now(), updated_by = v_user, version = version + 1
      where team_id = p_team_id and id = p_record_id returning version, to_jsonb(fai_athletes.*) into v_new, v_row;
      v_audit_operation := 'delete';
    else
      insert into public.fai_athletes(team_id,id,name,grade,position,position_group,height_in,weight_lbs,photo_url,created_by,updated_by)
      values (p_team_id,p_record_id,p_payload->>'name',(p_payload->>'grade')::integer,coalesce(p_payload->>'position','ATH'),coalesce(p_payload->>'positionGroup','ATH'),coalesce((p_payload->>'heightIn')::numeric,0),coalesce((p_payload->>'weightLbs')::numeric,0),nullif(p_payload->>'photoUrl',''),v_user,v_user)
      on conflict (team_id,id) do update set name=excluded.name,grade=excluded.grade,position=excluded.position,position_group=excluded.position_group,height_in=excluded.height_in,weight_lbs=excluded.weight_lbs,photo_url=excluded.photo_url,deleted_at=null,updated_at=now(),updated_by=v_user,version=public.fai_athletes.version+1
      returning version, to_jsonb(fai_athletes.*) into v_new, v_row;
      v_audit_operation := case when v_current is null then 'insert' else 'update' end;
    end if;

  elsif p_entity = 'event' then
    select version into v_current from public.fai_testing_events where team_id = p_team_id and id = p_record_id;
    if found and p_expected_version is distinct from v_current then
      select to_jsonb(e) into v_row from public.fai_testing_events e where team_id = p_team_id and id = p_record_id;
      return jsonb_build_object('ok', false, 'conflict', true, 'remoteVersion', v_current, 'remoteRecord', v_row);
    end if;
    if p_operation = 'delete' then
      if not found then return jsonb_build_object('ok', true, 'version', 0); end if;
      update public.fai_testing_events set deleted_at=now(),updated_at=now(),updated_by=v_user,version=version+1
      where team_id=p_team_id and id=p_record_id returning version,to_jsonb(fai_testing_events.*) into v_new,v_row;
      v_audit_operation := 'delete';
    else
      insert into public.fai_testing_events(team_id,id,name,phase,start_date,end_date,status,source_created_at,created_by,updated_by)
      values (p_team_id,p_record_id,p_payload->>'name',p_payload->>'phase',(p_payload->>'startDate')::date,nullif(p_payload->>'endDate','')::date,nullif(p_payload->>'status',''),nullif(p_payload->>'createdAt','')::timestamptz,v_user,v_user)
      on conflict (team_id,id) do update set name=excluded.name,phase=excluded.phase,start_date=excluded.start_date,end_date=excluded.end_date,status=excluded.status,source_created_at=excluded.source_created_at,deleted_at=null,updated_at=now(),updated_by=v_user,version=public.fai_testing_events.version+1
      returning version,to_jsonb(fai_testing_events.*) into v_new,v_row;
      v_audit_operation := case when v_current is null then 'insert' else 'update' end;
    end if;

  elsif p_entity = 'session' then
    select version into v_current from public.fai_test_sessions where team_id = p_team_id and id = p_record_id;
    if found and p_expected_version is distinct from v_current then
      select to_jsonb(s) into v_row from public.fai_test_sessions s where team_id = p_team_id and id = p_record_id;
      return jsonb_build_object('ok', false, 'conflict', true, 'remoteVersion', v_current, 'remoteRecord', v_row);
    end if;
    if p_operation = 'delete' then
      if not found then return jsonb_build_object('ok', true, 'version', 0); end if;
      update public.fai_test_sessions set deleted_at=now(),updated_at=now(),updated_by=v_user,version=version+1
      where team_id=p_team_id and id=p_record_id returning version,to_jsonb(fai_test_sessions.*) into v_new,v_row;
      v_audit_operation := 'delete';
    else
      insert into public.fai_test_sessions(
        team_id,id,athlete_id,event_id,test_date,phase,source_created_at,grade_snapshot,position_snapshot,position_group_snapshot,weight_lbs_snapshot,
        bench_max,dash40_1,dash40_2,fly10_1,fly10_2,hang_clean_reps,shuttle20_1,shuttle20_2,lat_shuttle_1,lat_shuttle_2,illinois,squat_max,broad_jump,vertical_jump,cond51015,created_by,updated_by
      ) values (
        p_team_id,p_record_id,p_payload->>'athleteId',p_payload->>'eventId',(p_payload->>'date')::date,p_payload->>'phase',nullif(p_payload->>'createdAt','')::timestamptz,
        nullif(p_payload->>'gradeSnapshot','')::integer,nullif(p_payload->>'positionSnapshot',''),nullif(p_payload->>'positionGroupSnapshot',''),nullif(p_payload->>'weightLbsSnapshot','')::numeric,
        nullif(p_payload->>'benchMax','')::numeric,nullif(p_payload->>'dash40_1','')::numeric,nullif(p_payload->>'dash40_2','')::numeric,nullif(p_payload->>'fly10_1','')::numeric,nullif(p_payload->>'fly10_2','')::numeric,
        nullif(p_payload->>'hangCleanReps','')::numeric,nullif(p_payload->>'shuttle20_1','')::numeric,nullif(p_payload->>'shuttle20_2','')::numeric,nullif(p_payload->>'latShuttle_1','')::numeric,nullif(p_payload->>'latShuttle_2','')::numeric,
        nullif(p_payload->>'illinois','')::numeric,nullif(p_payload->>'squatMax','')::numeric,nullif(p_payload->>'broadJump','')::numeric,nullif(p_payload->>'verticalJump','')::numeric,nullif(p_payload->>'cond51015','')::numeric,v_user,v_user
      )
      on conflict (team_id,id) do update set athlete_id=excluded.athlete_id,event_id=excluded.event_id,test_date=excluded.test_date,phase=excluded.phase,source_created_at=excluded.source_created_at,grade_snapshot=excluded.grade_snapshot,position_snapshot=excluded.position_snapshot,position_group_snapshot=excluded.position_group_snapshot,weight_lbs_snapshot=excluded.weight_lbs_snapshot,bench_max=excluded.bench_max,dash40_1=excluded.dash40_1,dash40_2=excluded.dash40_2,fly10_1=excluded.fly10_1,fly10_2=excluded.fly10_2,hang_clean_reps=excluded.hang_clean_reps,shuttle20_1=excluded.shuttle20_1,shuttle20_2=excluded.shuttle20_2,lat_shuttle_1=excluded.lat_shuttle_1,lat_shuttle_2=excluded.lat_shuttle_2,illinois=excluded.illinois,squat_max=excluded.squat_max,broad_jump=excluded.broad_jump,vertical_jump=excluded.vertical_jump,cond51015=excluded.cond51015,deleted_at=null,updated_at=now(),updated_by=v_user,version=public.fai_test_sessions.version+1
      returning version,to_jsonb(fai_test_sessions.*) into v_new,v_row;
      v_audit_operation := case when v_current is null then 'insert' else 'update' end;
    end if;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid entity');
  end if;

  insert into public.fai_audit_log(team_id,actor_id,entity,record_id,operation,old_version,new_version)
  values (p_team_id,v_user,p_entity,p_record_id,v_audit_operation,v_current,v_new);
  return jsonb_build_object('ok', true, 'version', v_new, 'updatedAt', now(), 'record', v_row);
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.fai_role(uuid) to authenticated;
grant execute on function public.fai_is_member(uuid) to authenticated;
grant execute on function public.fai_can_edit(uuid) to authenticated;
grant execute on function public.fai_is_admin(uuid) to authenticated;
grant execute on function public.create_fai_team(text) to authenticated;
grant execute on function public.create_fai_invite(uuid,text,integer,integer) to authenticated;
grant execute on function public.join_fai_team(uuid) to authenticated;
grant execute on function public.apply_fai_mutation(uuid,text,text,text,jsonb,integer) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.fai_athletes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.fai_testing_events;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.fai_test_sessions;
exception when duplicate_object then null;
end $$;

commit;
