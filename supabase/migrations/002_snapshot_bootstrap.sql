-- Fast, one-transaction initialization for a newly created empty FAI team.
-- Normal edits continue through apply_fai_mutation and its optimistic concurrency.

begin;

create or replace function public.import_fai_snapshot(
  p_team_id uuid,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_athletes integer := 0;
  v_events integer := 0;
  v_sessions integer := 0;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'Authentication required');
  end if;
  if not public.fai_is_admin(p_team_id) then
    return jsonb_build_object('ok', false, 'error', 'Owner or admin access required');
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Invalid snapshot');
  end if;

  -- Bootstrap is intentionally non-destructive. It only runs before any record,
  -- including a soft-deleted record, exists for the team.
  if exists (select 1 from public.fai_athletes where team_id = p_team_id)
     or exists (select 1 from public.fai_testing_events where team_id = p_team_id)
     or exists (select 1 from public.fai_test_sessions where team_id = p_team_id) then
    return jsonb_build_object('ok', false, 'error', 'Team is not empty');
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_snapshot->'athletes', '[]'::jsonb)) loop
    insert into public.fai_athletes(
      team_id,id,name,grade,position,position_group,height_in,weight_lbs,photo_url,
      version,created_by,updated_by
    ) values (
      p_team_id,
      v_item->>'id',
      v_item->>'name',
      (v_item->>'grade')::integer,
      coalesce(v_item->>'position','ATH'),
      coalesce(v_item->>'positionGroup','ATH'),
      coalesce(nullif(v_item->>'heightIn','')::numeric,0),
      coalesce(nullif(v_item->>'weightLbs','')::numeric,0),
      nullif(v_item->>'photoUrl',''),
      1,v_user,v_user
    );
    insert into public.fai_audit_log(
      team_id,actor_id,entity,record_id,operation,old_version,new_version
    ) values (p_team_id,v_user,'athlete',v_item->>'id','insert',null,1);
    v_athletes := v_athletes + 1;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_snapshot->'events', '[]'::jsonb)) loop
    insert into public.fai_testing_events(
      team_id,id,name,phase,start_date,end_date,status,source_created_at,
      version,created_by,updated_by
    ) values (
      p_team_id,
      v_item->>'id',
      v_item->>'name',
      v_item->>'phase',
      (v_item->>'startDate')::date,
      nullif(v_item->>'endDate','')::date,
      nullif(v_item->>'status',''),
      nullif(v_item->>'createdAt','')::timestamptz,
      1,v_user,v_user
    );
    insert into public.fai_audit_log(
      team_id,actor_id,entity,record_id,operation,old_version,new_version
    ) values (p_team_id,v_user,'event',v_item->>'id','insert',null,1);
    v_events := v_events + 1;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_snapshot->'sessions', '[]'::jsonb)) loop
    insert into public.fai_test_sessions(
      team_id,id,athlete_id,event_id,test_date,phase,source_created_at,
      grade_snapshot,position_snapshot,position_group_snapshot,weight_lbs_snapshot,
      bench_max,dash40_1,dash40_2,fly10_1,fly10_2,hang_clean_reps,
      shuttle20_1,shuttle20_2,lat_shuttle_1,lat_shuttle_2,illinois,
      squat_max,broad_jump,vertical_jump,cond51015,version,created_by,updated_by
    ) values (
      p_team_id,
      v_item->>'id',
      v_item->>'athleteId',
      v_item->>'eventId',
      (v_item->>'date')::date,
      v_item->>'phase',
      nullif(v_item->>'createdAt','')::timestamptz,
      nullif(v_item->>'gradeSnapshot','')::integer,
      nullif(v_item->>'positionSnapshot',''),
      nullif(v_item->>'positionGroupSnapshot',''),
      nullif(v_item->>'weightLbsSnapshot','')::numeric,
      nullif(v_item->>'benchMax','')::numeric,
      nullif(v_item->>'dash40_1','')::numeric,
      nullif(v_item->>'dash40_2','')::numeric,
      nullif(v_item->>'fly10_1','')::numeric,
      nullif(v_item->>'fly10_2','')::numeric,
      nullif(v_item->>'hangCleanReps','')::numeric,
      nullif(v_item->>'shuttle20_1','')::numeric,
      nullif(v_item->>'shuttle20_2','')::numeric,
      nullif(v_item->>'latShuttle_1','')::numeric,
      nullif(v_item->>'latShuttle_2','')::numeric,
      nullif(v_item->>'illinois','')::numeric,
      nullif(v_item->>'squatMax','')::numeric,
      nullif(v_item->>'broadJump','')::numeric,
      nullif(v_item->>'verticalJump','')::numeric,
      nullif(v_item->>'cond51015','')::numeric,
      1,v_user,v_user
    );
    insert into public.fai_audit_log(
      team_id,actor_id,entity,record_id,operation,old_version,new_version
    ) values (p_team_id,v_user,'session',v_item->>'id','insert',null,1);
    v_sessions := v_sessions + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'athletes', v_athletes,
    'events', v_events,
    'sessions', v_sessions
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

revoke all on function public.import_fai_snapshot(uuid,jsonb) from public, anon;
grant execute on function public.import_fai_snapshot(uuid,jsonb) to authenticated;

commit;
