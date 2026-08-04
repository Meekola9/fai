-- Coach-defined film tagging catalog: custom formations, personnel groupings,
-- and run/pass concepts that extend the built-in vocabulary (see
-- src/lib/filmAnalysis.ts). Lets a staff add their own looks — including
-- opponent formations transcribed from film — without a code change. Team-scoped
-- like the other tables: public read (shared view), team-member write. Additive
-- and backwards compatible; run once in the Supabase SQL editor.

create table if not exists public.film_catalog (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  kind text not null,
  entry_key text not null,
  label text not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists film_catalog_team_kind_idx
  on public.film_catalog (team_id, kind);

alter table public.film_catalog enable row level security;

-- Public read, matching the other tables so the shared team view works.
drop policy if exists "Public can view film catalog" on public.film_catalog;
create policy "Public can view film catalog"
  on public.film_catalog for select
  to anon, authenticated
  using (true);

-- Only members of the team may insert / update / delete its catalog entries.
drop policy if exists "Members manage film catalog" on public.film_catalog;
create policy "Members manage film catalog"
  on public.film_catalog for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
