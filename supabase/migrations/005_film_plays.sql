-- Film analysis breakdowns: one tagged snap from game film (usually an
-- opponent's, for scouting). The video itself is never stored — only the seek
-- point plus the situational tags and drawn overlays (routes / trails), which
-- live in the jsonb `annotations` column. Team-scoped like the other tables —
-- public read (for the shared view), team-member write. Run once in the
-- Supabase SQL editor.

create table if not exists public.film_plays (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  film_label text,
  video_time_sec numeric,
  opponent text,
  play_date date,
  side text,
  quarter int,
  down int,
  distance int,
  yard_line int,
  hash text,
  formation text,
  personnel text,
  call text,
  concept text,
  ball_carrier_id text,
  target_id text,
  gain numeric,
  result text,
  annotations jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists film_plays_team_opponent_idx
  on public.film_plays (team_id, opponent);

alter table public.film_plays enable row level security;

-- Public read, matching athletes / test_sessions so the shared team view works.
drop policy if exists "Public can view film" on public.film_plays;
create policy "Public can view film"
  on public.film_plays for select
  to anon, authenticated
  using (true);

-- Only members of the team may insert / update / delete its film.
drop policy if exists "Members manage film" on public.film_plays;
create policy "Members manage film"
  on public.film_plays for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
