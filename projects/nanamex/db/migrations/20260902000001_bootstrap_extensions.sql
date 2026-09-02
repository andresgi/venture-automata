-- Bootstrap migration for the Clin (Nanamex) migrations pipeline (E0-02).
--
-- Enables the Postgres extension the schema migrations in E0-03+ rely on for
-- `gen_random_uuid()` (used as the default for every table's `uuid` primary key,
-- per engineering/database.md). Supabase-hosted projects ship with `pgcrypto`
-- available in the `extensions` schema already, but this migration makes the
-- dependency explicit and reproducible for any fresh instance (local or hosted),
-- rather than relying on an implicit platform default.
create extension if not exists pgcrypto with schema extensions;
