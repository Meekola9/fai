-- Athlete profile photo uploads.
-- Public downloads are intentional because athlete cards are visible in the shared team view.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'athlete-photos',
  'athlete-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.fai_can_manage_athlete_photo(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select
    exists (
      select 1
      from public.athlete_claims claim
      where claim.user_id = auth.uid()
        and claim.status = 'approved'
        and claim.team_id::text = split_part(p_name, '/', 1)
        and claim.athlete_id = split_part(p_name, '/', 2)
    )
    or exists (
      select 1
      from public.team_members member
      where member.user_id = auth.uid()
        and member.team_id::text = split_part(p_name, '/', 1)
        and public.fai_has_permission(member.team_id, 'roster')
    );
$$;

revoke all on function public.fai_can_manage_athlete_photo(text) from public;
grant execute on function public.fai_can_manage_athlete_photo(text) to authenticated;

drop policy if exists "athlete photos authenticated read" on storage.objects;
drop policy if exists "athlete photos approved upload" on storage.objects;
drop policy if exists "athlete photos approved update" on storage.objects;
drop policy if exists "athlete photos approved delete" on storage.objects;

create policy "athlete photos authenticated read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'athlete-photos'
  and public.fai_can_manage_athlete_photo(name)
);

create policy "athlete photos approved upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'athlete-photos'
  and public.fai_can_manage_athlete_photo(name)
);

create policy "athlete photos approved update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'athlete-photos'
  and public.fai_can_manage_athlete_photo(name)
)
with check (
  bucket_id = 'athlete-photos'
  and public.fai_can_manage_athlete_photo(name)
);

create policy "athlete photos approved delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'athlete-photos'
  and public.fai_can_manage_athlete_photo(name)
);
