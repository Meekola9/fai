-- Sideline dashboard inputs: two optional per-play tags on film_plays.
--   box_count   — defenders in the box on the snap (box-count / run advantage)
--   hidden_yards — signed hidden yardage from our view (special teams, penalties,
--                  turnover field position); positive = in our favor
-- Additive and backwards compatible; run once in the Supabase SQL editor.

alter table public.film_plays add column if not exists box_count numeric;
alter table public.film_plays add column if not exists hidden_yards numeric;
