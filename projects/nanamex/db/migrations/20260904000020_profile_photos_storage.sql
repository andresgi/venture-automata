-- E7-01: `profile-photos` Supabase Storage bucket (engineering/architecture.md §8) --
-- public-read (niñera profile photos are meant to be seen by families browsing), but
-- writes are restricted to the owning niñera's own path. `identity-documents` (the private
-- bucket) is explicitly out of scope here -- that's E7-03 (NIN-08).
--
-- Object path convention: `{profile_id}/{filename}` -- `(storage.foldername(name))[1]` is
-- the first path segment, checked against `auth.uid()` the same way this codebase's
-- existing RLS policies derive ownership from the session rather than trusting client
-- input (e.g. `ninera_zonas_write_own` in 20260902000006_perfil_ninera.sql).
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy profile_photos_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'profile-photos');

create policy profile_photos_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy profile_photos_owner_update
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy profile_photos_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
