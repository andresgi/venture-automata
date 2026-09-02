-- zonas: seeded, static geographic reference table (engineering/database.md §4). Backs the
-- "Zona" field on both sides (perfil_familiar, necesidades, ninera_zonas) and the Match
-- Score "Ubicación" factor (architecture.md §10/§15). System-owned, append-only -- never
-- user-editable, expanding to a new city/alcaldía is a data-seed operation, not a schema
-- change.

create table public.zonas (
  id uuid primary key default extensions.gen_random_uuid(),
  alcaldia_municipio text not null,
  colonia text,
  ciudad text not null,
  lat numeric,
  lng numeric
);

comment on table public.zonas is
  'Seeded, static geographic reference table (database.md §4). alcaldia_municipio is the '
  'comparison granularity for matching; colonia is a finer-grained autocomplete label only, '
  'not used for match comparison in V1. lat/lng are seeded centroids for the map-pin '
  'display only (architecture.md §10) -- never used in matching logic.';

-- Keeps re-running the seed script idempotent (ON CONFLICT DO NOTHING keyed on this).
-- coalesce(colonia, '') so two alcaldía-level rows (colonia is null) in the same city can't
-- silently duplicate either.
create unique index zonas_ciudad_alcaldia_colonia_key
  on public.zonas (ciudad, alcaldia_municipio, coalesce(colonia, ''));

create index zonas_ciudad_idx on public.zonas (ciudad);

alter table public.zonas enable row level security;

-- Public, non-sensitive reference data -- readable by any client, including pre-auth (the
-- zona autocomplete is used during onboarding). Never client-writable: rows are only ever
-- written by the migrations/seed pipeline, which runs with elevated (postgres) privileges
-- that bypass RLS -- no insert/update/delete policy exists for any client role.
create policy zonas_select_all
  on public.zonas
  for select
  to anon, authenticated
  using (true);
