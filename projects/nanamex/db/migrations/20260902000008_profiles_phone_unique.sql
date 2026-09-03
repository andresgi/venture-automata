-- E0-04 (auth wiring): backs the app-layer duplicate-phone registration check
-- (design/UX-spec.md AUTH-02 "duplicate-email/phone check server-side") with a DB-level
-- constraint, so a race condition between the app's pre-check and the actual insert can't
-- silently create two profiles sharing a phone number. Partial index (excludes NULL) since
-- `profiles.phone` is nullable (admin-provisioned accounts have no phone) and Postgres
-- unique indexes already treat multiple NULLs as non-conflicting -- the `where` clause here
-- just makes that explicit and matches this schema's existing partial-unique-index pattern
-- (`zonas`' `(ciudad, alcaldia_municipio, colonia)` index, per db/seed.sql).

create unique index profiles_phone_unique_idx
  on public.profiles (phone)
  where phone is not null;
