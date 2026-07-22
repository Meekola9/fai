-- Add a film link column to athletes for the profile "Film" section (Hudl,
-- YouTube, or Vimeo). Nullable and free-form; the app decides whether to embed
-- or link out. Run once in the Supabase SQL editor.

alter table public.athletes
  add column if not exists hudl_url text;
