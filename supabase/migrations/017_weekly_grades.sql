-- Private staff evaluations, separate from the public roster and game statistics.
create table if not exists public.weekly_grades (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  athlete_id text not null,
  position_group text not null,
  game_date date not null,
  opponent_key text not null check (length(trim(opponent_key)) > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  primary key (team_id, id),
  unique (team_id, athlete_id, position_group, game_date, opponent_key)
);
alter table public.weekly_grades enable row level security;
revoke all on public.weekly_grades from anon;
grant select, insert, update on public.weekly_grades to authenticated;
create policy "Staff read weekly grades" on public.weekly_grades for select to authenticated
using (exists (
  select 1 from public.team_members m where m.team_id = weekly_grades.team_id
    and m.user_id = auth.uid() and lower(m.role) in ('owner', 'admin', 'coach', 'editor', 'manager')
));
create policy "Staff insert weekly grades" on public.weekly_grades for insert to authenticated
with check (exists (
  select 1 from public.team_members m where m.team_id = weekly_grades.team_id
    and m.user_id = auth.uid() and lower(m.role) in ('owner', 'admin', 'coach', 'editor', 'manager')
));
create policy "Staff update weekly grades" on public.weekly_grades for update to authenticated
using (exists (
  select 1 from public.team_members m where m.team_id = weekly_grades.team_id
    and m.user_id = auth.uid() and lower(m.role) in ('owner', 'admin', 'coach', 'editor', 'manager')
))
with check (exists (
  select 1 from public.team_members m where m.team_id = weekly_grades.team_id
    and m.user_id = auth.uid() and lower(m.role) in ('owner', 'admin', 'coach', 'editor', 'manager')
));
