-- FAI coaches receive the complete football operating package because the
-- current local-first cloud sync writes roster, testing, awards, and film as a
-- coordinated team snapshot. Staff and destructive data administration remain
-- owner/administrator only.

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
          or (
            lower(tm.role) = 'coach'
            and p_permission in ('roster', 'testing', 'film', 'awards', 'reports')
          )
        )
    ),
    false
  )
$$;

grant execute on function public.fai_has_permission(uuid, text) to authenticated;
