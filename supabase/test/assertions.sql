do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename like 'fai_%'
      and 'anon' = any(roles)
  ) then
    raise exception 'Anonymous FAI policy detected';
  end if;

  if has_table_privilege('anon', 'public.fai_athletes', 'select')
     or has_table_privilege('anon', 'public.fai_testing_events', 'select')
     or has_table_privilege('anon', 'public.fai_test_sessions', 'select') then
    raise exception 'Anonymous FAI table access detected';
  end if;

  if has_table_privilege('authenticated', 'public.fai_athletes', 'insert')
     or has_table_privilege('authenticated', 'public.fai_athletes', 'update')
     or has_table_privilege('authenticated', 'public.fai_athletes', 'delete')
     or has_table_privilege('authenticated', 'public.fai_testing_events', 'insert')
     or has_table_privilege('authenticated', 'public.fai_test_sessions', 'insert') then
    raise exception 'Authenticated direct-write privilege detected';
  end if;

  if not has_table_privilege('authenticated', 'public.fai_athletes', 'select') then
    raise exception 'Authenticated read privilege missing';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.apply_fai_mutation(uuid,text,text,text,jsonb,integer)',
    'execute'
  ) then
    raise exception 'Authenticated mutation RPC privilege missing';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.import_fai_snapshot(uuid,jsonb)',
    'execute'
  ) then
    raise exception 'Authenticated snapshot bootstrap privilege missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.apply_fai_mutation(uuid,text,text,text,jsonb,integer)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.import_fai_snapshot(uuid,jsonb)',
    'execute'
  ) then
    raise exception 'Anonymous cloud RPC access detected';
  end if;
end;
$$;

do $$
declare
  v_user uuid := '11111111-1111-4111-8111-111111111111';
  v_team uuid;
  v_result jsonb;
  v_snapshot jsonb;
  v_count integer;
begin
  insert into auth.users(id) values (v_user);
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  v_team := public.create_fai_team('CI Test Team');
  if v_team is null then raise exception 'Team creation returned null'; end if;

  v_snapshot := jsonb_build_object(
    'athletes', jsonb_build_array(jsonb_build_object(
      'id','athlete-ci','name','CI Athlete','grade',10,'position','WR',
      'positionGroup','WR','heightIn',70,'weightLbs',180
    )),
    'events', jsonb_build_array(jsonb_build_object(
      'id','event-ci','name','CI Baseline','phase','Baseline',
      'startDate','2026-01-10','status','closed'
    )),
    'sessions', jsonb_build_array(jsonb_build_object(
      'id','session-ci','athleteId','athlete-ci','eventId','event-ci',
      'date','2026-01-10','phase','Baseline','benchMax',225,
      'dash40_1',4.7,'dash40_2',4.72
    ))
  );

  v_result := public.import_fai_snapshot(v_team, v_snapshot);
  if coalesce((v_result->>'ok')::boolean, false) is not true then
    raise exception 'Snapshot bootstrap failed: %', v_result;
  end if;
  if (v_result->>'athletes')::integer <> 1
     or (v_result->>'events')::integer <> 1
     or (v_result->>'sessions')::integer <> 1 then
    raise exception 'Snapshot bootstrap counts are incorrect: %', v_result;
  end if;

  select count(*) into v_count from public.fai_test_sessions where team_id = v_team;
  if v_count <> 1 then raise exception 'Snapshot session was not inserted'; end if;

  v_result := public.import_fai_snapshot(v_team, v_snapshot);
  if coalesce((v_result->>'ok')::boolean, false) is true
     or v_result->>'error' <> 'Team is not empty' then
    raise exception 'Second snapshot bootstrap was not rejected: %', v_result;
  end if;

  v_result := public.apply_fai_mutation(
    v_team,
    'athlete',
    'upsert',
    'athlete-ci',
    jsonb_build_object(
      'id','athlete-ci','name','CI Athlete Updated','grade',11,
      'position','WR','positionGroup','WR','heightIn',71,'weightLbs',185
    ),
    1
  );
  if coalesce((v_result->>'ok')::boolean, false) is not true
     or (v_result->>'version')::integer <> 2 then
    raise exception 'Versioned athlete update failed: %', v_result;
  end if;

  v_result := public.apply_fai_mutation(
    v_team,
    'athlete',
    'upsert',
    'athlete-ci',
    jsonb_build_object(
      'id','athlete-ci','name','Stale Update','grade',11,
      'position','WR','positionGroup','WR','heightIn',71,'weightLbs',185
    ),
    1
  );
  if coalesce((v_result->>'conflict')::boolean, false) is not true
     or (v_result->>'remoteVersion')::integer <> 2 then
    raise exception 'Stale write conflict was not detected: %', v_result;
  end if;
end;
$$;

-- Role enforcement, owner membership, and team-scoped RLS isolation.
do $$
declare
  v_owner uuid := '22222222-2222-4222-8222-222222222222';
  v_viewer uuid := '33333333-3333-4333-8333-333333333333';
  v_outsider uuid := '44444444-4444-4444-8444-444444444444';
  v_team uuid;
  v_result jsonb;
  v_role text;
  v_count integer;
begin
  insert into auth.users(id) values (v_owner), (v_viewer), (v_outsider);

  -- Owner creates a team; membership row must be created with role owner.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  v_team := public.create_fai_team('Role Team');
  select role into v_role from public.fai_team_members
    where team_id = v_team and user_id = v_owner;
  if v_role is distinct from 'owner' then
    raise exception 'Owner membership was not created (role=%)', v_role;
  end if;

  -- Owner seeds one athlete through the mutation RPC.
  v_result := public.apply_fai_mutation(
    v_team, 'athlete', 'upsert', 'role-athlete',
    jsonb_build_object('name','Role Athlete','grade',9,'position','RB',
      'positionGroup','RB','heightIn',68,'weightLbs',170), null);
  if coalesce((v_result->>'ok')::boolean, false) is not true then
    raise exception 'Owner write failed: %', v_result;
  end if;

  -- A viewer joins the team (direct insert in the harness; invites in the app).
  insert into public.fai_team_members(team_id, user_id, role)
    values (v_team, v_viewer, 'viewer');

  -- Viewer cannot edit team data.
  perform set_config('request.jwt.claim.sub', v_viewer::text, true);
  v_result := public.apply_fai_mutation(
    v_team, 'athlete', 'upsert', 'role-athlete',
    jsonb_build_object('name','Viewer Edit','grade',9,'position','RB',
      'positionGroup','RB','heightIn',68,'weightLbs',170), 1);
  if coalesce((v_result->>'ok')::boolean, false) is true
     or v_result->>'error' <> 'Write access required' then
    raise exception 'Viewer edit was not blocked: %', v_result;
  end if;

  -- Non-member cannot read team data (RLS enforced under the authenticated role).
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  execute 'set local role authenticated';
  select count(*) into v_count from public.fai_athletes where team_id = v_team;
  if v_count <> 0 then
    execute 'reset role';
    raise exception 'Non-member read % athlete row(s) via RLS', v_count;
  end if;

  -- A genuine member still reads their own team through RLS.
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  select count(*) into v_count from public.fai_athletes where team_id = v_team;
  execute 'reset role';
  if v_count <> 1 then
    raise exception 'Member could not read own team athletes (got %)', v_count;
  end if;
end;
$$;
