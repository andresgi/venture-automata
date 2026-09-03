-- Core enum types backing profiles/perfil_familiar/perfil_ninera (engineering/database.md
-- §1-4), plus the two enums this migration set shares with tables that will be added in a
-- later migration (necesidades/necesidad_children, database.md §5/§5a/§7) so both sides of
-- the matching comparisons stay a single fixed type, not duplicated per-table strings.

create type public.user_role as enum ('familia', 'ninera', 'admin');

create type public.account_status as enum ('activa', 'suspendida', 'eliminada');

-- Shared by perfil_ninera.modalidades_aceptadas (this migration) and, in a future
-- migration, necesidades.modalidad (database.md §5) -- same enum on both sides of the
-- modalidad hard filter (architecture.md §15.1).
create type public.modalidad as enum ('planta', 'entrada_salida', 'ocasional');

-- Structural enforcement of "children's data as age ranges only, never exact age or
-- birthdate" (config/CONSTRAINTS.md; database.md §7 "Shared enum reference"). Used here by
-- ninera_experiencia_edades.rango_edad and, in a future migration, by
-- necesidad_children.rango_edad (database.md §5a) -- the same fixed enum on both sides so
-- the Match Score "Edad de los niños" factor is a plain set-intersection query, per
-- journeys.md J-NIN-1.
create type public.rango_edad as enum ('0-1', '1-3', '3-6', '6-12', '12+');

create type public.ninera_verification_status as enum ('no_verificada', 'en_proceso', 'verificada');
