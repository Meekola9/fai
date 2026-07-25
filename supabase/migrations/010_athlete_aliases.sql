-- Coach-approved aliases used by Bulk Import athlete matching.
-- Aliases are team-scoped and private to roster-authorized staff.

create table if not exists public.athlete_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  athlete_id text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_aliases_alias_not_blank check (length(trim(alias)) > 0),
  constraint athlete_aliases_normalized_not_blank check (length(trim(normalized_alias)) > 0),
  constraint athlete_aliases_team_normalized_unique unique (team_id, normalized_alias)
);

create index if not exists athlete_aliases_team_idx
  on public.athlete_aliases(team_id);
create index if not exists athlete_aliases_team_athlete_idx
  on public.athlete_aliases(team_id, athlete_id);

alter table public.athlete_aliases enable row level security;

drop policy if exists "athlete aliases roster read" on public.athlete_aliases;
drop policy if exists "athlete aliases roster insert" on public.athlete_aliases;
drop policy if exists "athlete aliases roster update" on public.athlete_aliases;
drop policy if exists "athlete aliases roster delete" on public.athlete_aliases;

create policy "athlete aliases roster read"
on public.athlete_aliases
for select
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster insert"
on public.athlete_aliases
for insert
to authenticated
with check (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster update"
on public.athlete_aliases
for update
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
)
with check (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

create policy "athlete aliases roster delete"
on public.athlete_aliases
for delete
to authenticated
using (
  exists (
    select 1
    from public.team_members member
    where member.user_id = auth.uid()
      and member.team_id = athlete_aliases.team_id
      and public.fai_has_permission(member.team_id, 'roster')
  )
);

grant select, insert, update, delete on public.athlete_aliases to authenticated;
