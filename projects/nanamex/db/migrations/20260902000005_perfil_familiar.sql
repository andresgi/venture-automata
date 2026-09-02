-- perfil_familiar: family-side profile data (engineering/database.md §2, PRD section 5
-- "Perfil familiar").

create table public.perfil_familiar (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  zona_id uuid not null references public.zonas (id)
);

comment on table public.perfil_familiar is
  'Family-side profile data (database.md §2). Created at FAM-01 onboarding (a later story) '
  '-- edits are self-service, no verification/badge implications (families are never '
  'subject to identity verification in V1).';

alter table public.perfil_familiar enable row level security;

create policy perfil_familiar_select_own_or_admin
  on public.perfil_familiar
  for select
  to authenticated
  using (profile_id = auth.uid() or public.is_admin());

create policy perfil_familiar_insert_own
  on public.perfil_familiar
  for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy perfil_familiar_update_own_or_admin
  on public.perfil_familiar
  for update
  to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());
