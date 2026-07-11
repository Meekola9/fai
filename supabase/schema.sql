-- FAI — Football Athlete Index :: cloud storage schema for Supabase.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- Model: the whole app dataset (athletes + testing sessions) is stored as a
-- single JSON document per TEAM CODE. A staff that shares the same deployment
-- (same VITE_FAI_TEAM_CODE) shares one dataset that syncs across devices.
--
-- The anon key is public (it ships in the web app), so the team code is the
-- practical gate that keeps programs separate. That's fine for a coaching
-- staff. If you later need hard per-user security, add Supabase Auth and
-- tighten the RLS policy below.

create table if not exists public.fai_state (
  team_code  text primary key,
  data       jsonb not null default '{"athletes":[],"sessions":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Enable row-level security, then allow the anon role to read/write.
-- (The team code in the app scopes which row is touched.)
alter table public.fai_state enable row level security;

drop policy if exists "fai_state_all" on public.fai_state;
create policy "fai_state_all"
  on public.fai_state
  for all
  to anon
  using (true)
  with check (true);
