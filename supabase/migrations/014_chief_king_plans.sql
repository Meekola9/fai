-- Chief-to-King plans: a coach's per-opponent game-plan worksheet. Names the
-- opponent's King (linchpin) and Chiefs (supporting players), and which Chief is
-- the weak point to attack. Powers the sideline "Chief-to-King" alert. Team-
-- scoped like the other tables: public read (shared view), team-member write.
-- Additive and backwards compatible; run once in the Supabase SQL editor.

create table if not exists public.chief_king_plans (
  team_id uuid not null references public.teams(id) on delete cascade,
  id text not null,
  opponent text not null,
  king_label text not null,
  king_position text not null,
  chiefs jsonb not null default '[]'::jsonb,
  weakest_chief_id text,
  note text,
  created_at timestamptz not null default now(),
  primary key (team_id, id)
);

create index if not exists chief_king_plans_team_opp_idx
  on public.chief_king_plans (team_id, opponent);

alter table public.chief_king_plans enable row level security;

drop policy if exists "Public can view chief king plans" on public.chief_king_plans;
create policy "Public can view chief king plans"
  on public.chief_king_plans for select
  to anon, authenticated
  using (true);

drop policy if exists "Members manage chief king plans" on public.chief_king_plans;
create policy "Members manage chief king plans"
  on public.chief_king_plans for all
  to authenticated
  using (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  )
  with check (
    team_id in (select team_id from public.team_members where user_id = auth.uid())
  );
