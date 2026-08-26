-- Player box-score stats: one athlete's countable stats for one game, kept in a
-- flexible `stats` jsonb so new stat keys never need a schema change. Powers the
-- per-player stat lines and efficiency metrics. Team-scoped like the other
-- tables: public read (shared view), team-member write. Additive and backwards
-- compatible; run once in the Supabase SQL editor.

create table if not exists public.player_stats (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  athlete_id text not null,
  date text not null,
  opponent text,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists player_stats_team_athlete_idx
  on public.player_stats (team_id, athlete_id);

alter table public.player_stats enable row level security;

drop policy if exists "Public can view player stats" on public.player_stats;
create policy "Public can view player stats"
  on public.player_stats for select
  to anon, authenticated
  using (true);

drop policy if exists "Members manage player stats" on public.player_stats;
create policy "Members manage player stats"
  on public.player_stats for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
