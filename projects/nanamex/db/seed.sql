-- Seed data for the `zonas` reference table (engineering/database.md §4).
--
-- Launch city: Monterrey (Área Metropolitana de Monterrey, Nuevo León) -- confirmed by the
-- human 2026-09-02 (see agent/DECISIONS.md "E0-03: V1 launch city confirmed as Monterrey"
-- and config/PROJECT.md), superseding this developer's earlier CDMX judgment call.
--
-- Coverage: 9 municipios of the Monterrey metro area's urban core (Monterrey, San Pedro
-- Garza García, San Nicolás de los Garza, Guadalupe, Apodaca, General Escobedo, Santa
-- Catarina, Juárez, García) -- one municipio-level row each (colonia = null, for a "just
-- pick my municipio" option), plus a representative subset of well-known real colonias per
-- municipio (not an exhaustive INEGI catalog -- MVP-appropriate sample, same scope/effort
-- as the CDMX version this replaces). lat/lng are approximate real-world centroids
-- (neighborhood-level precision) -- per architecture.md §10 the map pin is "illustrative,
-- not authoritative," never used in matching logic (matching compares alcaldia_municipio
-- only). `ciudad` is set to 'Monterrey' for every row, representing the metro area as a
-- whole (the same pattern the CDMX version used: one `ciudad` value spanning several
-- `alcaldia_municipio` values).
--
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING against the unique
-- (ciudad, alcaldia_municipio, colonia) index defined in the zonas migration).

insert into public.zonas (ciudad, alcaldia_municipio, colonia, lat, lng) values
  -- Monterrey (centro metropolitano)
  ('Monterrey', 'Monterrey', null, 25.6866, -100.3161),
  ('Monterrey', 'Monterrey', 'Centro', 25.6714, -100.3097),
  ('Monterrey', 'Monterrey', 'Obispado', 25.6720, -100.3350),
  ('Monterrey', 'Monterrey', 'Mitras Centro', 25.6850, -100.3450),
  ('Monterrey', 'Monterrey', 'Cumbres', 25.7350, -100.3550),
  ('Monterrey', 'Monterrey', 'Del Norte', 25.7100, -100.2950),

  -- San Pedro Garza García
  ('Monterrey', 'San Pedro Garza García', null, 25.6560, -100.4020),
  ('Monterrey', 'San Pedro Garza García', 'Del Valle', 25.6480, -100.3650),
  ('Monterrey', 'San Pedro Garza García', 'Valle Oriente', 25.6280, -100.3550),
  ('Monterrey', 'San Pedro Garza García', 'San Agustín', 25.6600, -100.3550),
  ('Monterrey', 'San Pedro Garza García', 'Fuentes del Valle', 25.6350, -100.3800),

  -- San Nicolás de los Garza
  ('Monterrey', 'San Nicolás de los Garza', null, 25.7420, -100.3020),
  ('Monterrey', 'San Nicolás de los Garza', 'Anáhuac', 25.7440, -100.3070),
  ('Monterrey', 'San Nicolás de los Garza', 'Las Puentes', 25.7580, -100.2980),
  ('Monterrey', 'San Nicolás de los Garza', 'La Escondida', 25.7300, -100.2850),

  -- Guadalupe
  ('Monterrey', 'Guadalupe', null, 25.6773, -100.2597),
  ('Monterrey', 'Guadalupe', 'Valle de Anáhuac', 25.6950, -100.2400),
  ('Monterrey', 'Guadalupe', 'La Pastora', 25.6870, -100.2650),
  ('Monterrey', 'Guadalupe', 'Real del Sol', 25.6600, -100.2500),
  ('Monterrey', 'Guadalupe', 'Nueva Castilla', 25.6650, -100.2450),

  -- Apodaca
  ('Monterrey', 'Apodaca', null, 25.7815, -100.1889),
  ('Monterrey', 'Apodaca', 'Ciudad Solidaridad', 25.7700, -100.2100),
  ('Monterrey', 'Apodaca', 'Huinalá', 25.7600, -100.1600),
  ('Monterrey', 'Apodaca', 'San Pablo', 25.7550, -100.1850),

  -- General Escobedo
  ('Monterrey', 'General Escobedo', null, 25.7967, -100.3167),
  ('Monterrey', 'General Escobedo', 'Cumbres Escobedo', 25.7800, -100.3400),
  ('Monterrey', 'General Escobedo', 'Real de Palmas', 25.8100, -100.3000),

  -- Santa Catarina
  ('Monterrey', 'Santa Catarina', null, 25.6736, -100.4581),
  ('Monterrey', 'Santa Catarina', 'La Fama', 25.6650, -100.4300),
  ('Monterrey', 'Santa Catarina', 'San Isidro', 25.6800, -100.4700),

  -- Juárez, N.L.
  ('Monterrey', 'Juárez', null, 25.6486, -100.0967),
  ('Monterrey', 'Juárez', 'Fidel Velázquez', 25.6550, -100.0900),
  ('Monterrey', 'Juárez', 'Valles de Santo Domingo', 25.6400, -100.1100),

  -- García
  ('Monterrey', 'García', null, 25.8150, -100.5900),
  ('Monterrey', 'García', 'Real de Palmares', 25.8000, -100.5700),
  ('Monterrey', 'García', 'Sendero', 25.8300, -100.5600)
on conflict (ciudad, alcaldia_municipio, coalesce(colonia, '')) do nothing;
