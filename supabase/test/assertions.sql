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

  if has_function_privilege(
    'anon',
    'public.apply_fai_mutation(uuid,text,text,text,jsonb,integer)',
    'execute'
  ) then
    raise exception 'Anonymous mutation RPC access detected';
  end if;
end;
$$;
