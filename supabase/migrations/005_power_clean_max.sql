alter table public.test_sessions
  add column if not exists power_clean_max numeric(8,2);

alter table public.test_sessions
  drop constraint if exists test_sessions_power_clean_max_check;

alter table public.test_sessions
  add constraint test_sessions_power_clean_max_check
  check (power_clean_max is null or power_clean_max between 25 and 700);

comment on column public.test_sessions.power_clean_max is
  'Measured Power Clean one-repetition maximum in pounds. Direct values override estimated legacy hang-clean 1RM values in FAI.';
