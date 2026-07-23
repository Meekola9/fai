-- Football Awareness Quiz results.
--
-- An athlete takes a 15-question awareness quiz from their own account and earns
-- an awareness score (0-100). Each attempt is one row. Athletes may record only
-- their OWN result (verified through an approved athlete_claims row from the
-- accounts/claims system); coaches manage the team's; public read for the shared
-- view. Team-scoped like the other tables. Run once in the Supabase SQL editor.

create table if not exists public.awareness_results (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  athlete_id text not null,
  quiz_id text not null,
  score numeric not null,
  correct int not null,
  total int not null,
  taken_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists awareness_results_team_athlete_idx
  on public.awareness_results (team_id, athlete_id);

alter table public.awareness_results enable row level security;

-- Public read, matching the other tables so the shared team view shows scores.
drop policy if exists "Public can view awareness" on public.awareness_results;
create policy "Public can view awareness"
  on public.awareness_results for select
  to anon, authenticated
  using (true);

-- Coaches (team members) may manage all awareness rows for their team.
drop policy if exists "Members manage awareness" on public.awareness_results;
create policy "Members manage awareness"
  on public.awareness_results for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );

-- An athlete may insert their own result — verified through an approved claim
-- linking their login to that athlete on that team.
drop policy if exists "Athletes record own awareness" on public.awareness_results;
create policy "Athletes record own awareness"
  on public.awareness_results for insert
  to authenticated
  with check (
    exists (
      select 1 from public.athlete_claims c
      where c.user_id = auth.uid()
        and c.team_id = awareness_results.team_id
        and c.athlete_id = awareness_results.athlete_id
        and c.status = 'approved'
    )
  );

drop policy if exists "Athletes update own awareness" on public.awareness_results;
create policy "Athletes update own awareness"
  on public.awareness_results for update
  to authenticated
  using (
    exists (
      select 1 from public.athlete_claims c
      where c.user_id = auth.uid()
        and c.team_id = awareness_results.team_id
        and c.athlete_id = awareness_results.athlete_id
        and c.status = 'approved'
    )
  )
  with check (
    exists (
      select 1 from public.athlete_claims c
      where c.user_id = auth.uid()
        and c.team_id = awareness_results.team_id
        and c.athlete_id = awareness_results.athlete_id
        and c.status = 'approved'
    )
  );
