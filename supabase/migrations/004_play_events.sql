-- Playmaker / Havoc plays: game events that earn athletes impact points.
-- Team-scoped like the other tables — public read (for the shared view),
-- team-member write. Run once in the Supabase SQL editor.

create table if not exists public.play_events (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  athlete_id text not null,
  type text not null,
  play_date date not null,
  opponent text,
  note text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists play_events_team_athlete_idx
  on public.play_events (team_id, athlete_id);

alter table public.play_events enable row level security;

-- Public read, matching athletes / test_sessions so the shared team view works.
drop policy if exists "Public can view plays" on public.play_events;
create policy "Public can view plays"
  on public.play_events for select
  to anon, authenticated
  using (true);

-- Only members of the team may insert / update / delete its plays.
drop policy if exists "Members manage plays" on public.play_events;
create policy "Members manage plays"
  on public.play_events for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
