-- perfil_ninera: public candidate profile (engineering/database.md §3), plus its join
-- tables ninera_experiencia_edades (§3a), ninera_zonas (§3b), and referencias (§3c).

create table public.perfil_ninera (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  foto_url text,
  anos_experiencia int,
  disponibilidad jsonb not null default '[]'::jsonb,
  salario_min int,
  salario_max int,
  modalidades_aceptadas public.modalidad[] not null default '{}',
  descripcion text,
  perfil_completo boolean not null default false,
  publicado boolean not null default false,
  verification_status public.ninera_verification_status not null default 'no_verificada',
  created_at timestamptz not null default now(),
  constraint perfil_ninera_descripcion_max_length check (char_length(descripcion) <= 1000),
  constraint perfil_ninera_salario_range check (
    salario_min is null or salario_max is null or salario_min <= salario_max
  )
);

comment on table public.perfil_ninera is
  'Public candidate profile (database.md §3) -- what FAM-06 (a later story) renders. '
  'Fields are nullable at the DB level to support the NIN-01/02 draft-onboarding wizard '
  '(progressive fill); "required for completion" is an application-layer rule (see '
  'perfil_completo below), not a NOT NULL constraint.';

comment on column public.perfil_ninera.perfil_completo is
  'Computed by application logic (a later story, NIN-01/02), not a Postgres GENERATED '
  'column: completeness also depends on ninera_experiencia_edades having >=1 row, which a '
  'single-row generated column cannot express (Postgres generated columns may only '
  'reference the same row). Defaults false; app sets true once all required fields '
  '(zona de trabajo, disponibilidad, modalidades, expectativa salarial, descripción, '
  '>=1 experiencia_edad -- database.md §3) are present.';

comment on column public.perfil_ninera.verification_status is
  'Denormalized, authoritative for display (TrustBadge). Source of truth for state '
  'transitions is identity_verifications (database.md §10, a future migration); this '
  'column is what every read path queries directly. System/admin-driven -- app-layer only '
  'writes it via the verification decision flow, never directly from a niñera-role request.';

create index perfil_ninera_publicado_idx on public.perfil_ninera (publicado);
create index perfil_ninera_verification_status_idx on public.perfil_ninera (verification_status);

alter table public.perfil_ninera enable row level security;

-- Defense-in-depth only (see profiles migration's comment on architecture.md §3). Any
-- authenticated user may read a published profile (browsing is core to the product); the
-- owner may always read their own (including unpublished draft state); admin reads all.
create policy perfil_ninera_select_own_published_or_admin
  on public.perfil_ninera
  for select
  to authenticated
  using (profile_id = auth.uid() or publicado or public.is_admin());

create policy perfil_ninera_insert_own
  on public.perfil_ninera
  for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy perfil_ninera_update_own_or_admin
  on public.perfil_ninera
  for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

-- 3a. ninera_experiencia_edades (database.md §3a)

create table public.ninera_experiencia_edades (
  ninera_id uuid not null references public.perfil_ninera (profile_id) on delete cascade,
  rango_edad public.rango_edad not null,
  primary key (ninera_id, rango_edad)
);

comment on table public.ninera_experiencia_edades is
  'Age ranges of children the niñera has experience with (database.md §3a). Same fixed '
  'rango_edad enum as necesidad_children (database.md §5a, a future migration) so the '
  'Match Score "Edad de los niños" factor is a plain set-intersection query.';

alter table public.ninera_experiencia_edades enable row level security;

create policy ninera_experiencia_edades_select
  on public.ninera_experiencia_edades
  for select
  to authenticated
  using (
    ninera_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.perfil_ninera pn
      where pn.profile_id = ninera_experiencia_edades.ninera_id and pn.publicado
    )
  );

create policy ninera_experiencia_edades_write_own
  on public.ninera_experiencia_edades
  for all
  to authenticated
  using (ninera_id = auth.uid() or public.is_admin())
  with check (ninera_id = auth.uid() or public.is_admin());

-- 3b. ninera_zonas (database.md §3b)

create table public.ninera_zonas (
  ninera_id uuid not null references public.perfil_ninera (profile_id) on delete cascade,
  zona_id uuid not null references public.zonas (id),
  primary key (ninera_id, zona_id)
);

comment on table public.ninera_zonas is
  'Zonas a niñera works in -- a niñera may work across multiple zonas (database.md §3b).';

create index ninera_zonas_zona_id_idx on public.ninera_zonas (zona_id);

alter table public.ninera_zonas enable row level security;

create policy ninera_zonas_select
  on public.ninera_zonas
  for select
  to authenticated
  using (
    ninera_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.perfil_ninera pn
      where pn.profile_id = ninera_zonas.ninera_id and pn.publicado
    )
  );

create policy ninera_zonas_write_own
  on public.ninera_zonas
  for all
  to authenticated
  using (ninera_id = auth.uid() or public.is_admin())
  with check (ninera_id = auth.uid() or public.is_admin());

-- 3c. referencias (database.md §3c)

create table public.referencias (
  id uuid primary key default extensions.gen_random_uuid(),
  ninera_id uuid not null references public.perfil_ninera (profile_id) on delete cascade,
  nombre text not null,
  relacion text not null,
  periodo text not null,
  contacto text
);

comment on table public.referencias is
  'Self-reported references (database.md §3c) -- never operator-verified in V1, and '
  'deliberately has no status column: the entire category is self-reported by design '
  '(UX Decision 2 / product/prd-addendum.md), matching the UX''s plain-row, un-badged '
  'treatment (design/UX-spec.md).';

create index referencias_ninera_id_idx on public.referencias (ninera_id);

alter table public.referencias enable row level security;

-- Public (any authenticated user viewing the profile) per engineering/security.md §2.1.
create policy referencias_select_authenticated
  on public.referencias
  for select
  to authenticated
  using (true);

create policy referencias_write_own
  on public.referencias
  for all
  to authenticated
  using (ninera_id = auth.uid() or public.is_admin())
  with check (ninera_id = auth.uid() or public.is_admin());
