-- Full-film workflow: one master source film (game / practice / scrimmage) that
-- many plays are cut from. The video itself is still never stored — only this
-- lightweight record plus per-play clip in/out points. Team-scoped like the
-- other tables: public read (shared view), team-member write. Additive and
-- backwards compatible; run once in the Supabase SQL editor.

-- Per-play source reference and clip range on the existing film table.
alter table public.film_plays add column if not exists film_source_id text;
alter table public.film_plays add column if not exists start_time_sec numeric;
alter table public.film_plays add column if not exists end_time_sec numeric;

create index if not exists film_plays_team_source_idx
  on public.film_plays (team_id, film_source_id);

-- Master source films.
create table if not exists public.film_sources (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  label text not null,
  kind text not null default 'game',
  source_date date,
  opponent text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

alter table public.film_sources enable row level security;

-- Public read, matching the other tables so the shared team view works.
drop policy if exists "Public can view film sources" on public.film_sources;
create policy "Public can view film sources"
  on public.film_sources for select
  to anon, authenticated
  using (true);

-- Only members of the team may insert / update / delete its source films.
drop policy if exists "Members manage film sources" on public.film_sources;
create policy "Members manage film sources"
  on public.film_sources for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
