-- Relax the grade snapshot constraint on test_sessions.
--
-- The bundled 2020-2025 historical archive back-computes each athlete's grade
-- at test time, so sessions recorded in earlier years legitimately carry
-- grade snapshots below 9 (currently 67 sessions with grade 8). The original
-- constraint only accepted high-school grades, which made the first
-- local-to-cloud upload fail with:
--
--   new row for relation "test_sessions" violates check constraint
--   "test_sessions_grade_snapshot_check"
--
-- Run this in the Supabase SQL editor (or via supabase db push).

alter table public.test_sessions
  drop constraint if exists test_sessions_grade_snapshot_check;

alter table public.test_sessions
  add constraint test_sessions_grade_snapshot_check
  check (grade_snapshot is null or grade_snapshot between 1 and 12);
