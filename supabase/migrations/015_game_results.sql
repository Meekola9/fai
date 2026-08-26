-- Game results: the final score of each game (our points vs the opponent's).
-- Powers the team record (W-L-T, points for / against) and the per-game W/L on
-- the game-by-game views. Team-scoped like the other tables: public read
-- (shared view), team-member write. Additive and backwards compatible; run once
-- in the Supabase SQL editor.

create table if not exists public.game_results (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  date text not null,
  opponent text not null,
  team_score integer not null default 0,
  opp_score integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists game_results_team_date_idx
  on public.game_results (team_id, date);

alter table public.game_results enable row level security;

drop policy if exists "Public can view game results" on public.game_results;
create policy "Public can view game results"
  on public.game_results for select
  to anon, authenticated
  using (true);

drop policy if exists "Members manage game results" on public.game_results;
create policy "Members manage game results"
  on public.game_results for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
