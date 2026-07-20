-- Public read-only access for athletes, families, and fans.
--
-- Lets anyone visiting the app (without signing in) view the team, roster,
-- testing events, and results so the dashboard, rankings, and TV Mode work
-- as a public leaderboard. Writes are unaffected: inserting, updating, and
-- deleting still require an authenticated team member, and coach sign-in is
-- still needed for data entry in the app.
--
-- Run this in the Supabase SQL editor.

drop policy if exists "Public can view teams" on public.teams;
create policy "Public can view teams"
  on public.teams for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view athletes" on public.athletes;
create policy "Public can view athletes"
  on public.athletes for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view testing events" on public.testing_events;
create policy "Public can view testing events"
  on public.testing_events for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can view test sessions" on public.test_sessions;
create policy "Public can view test sessions"
  on public.test_sessions for select
  to anon, authenticated
  using (true);
