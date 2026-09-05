-- E7-03 / NIN-08: private identity-document storage and append-only submissions.
insert into storage.buckets (id, name, public) values ('identity-documents', 'identity-documents', false) on conflict (id) do nothing;

create policy identity_documents_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy identity_documents_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'identity-documents' and public.is_admin());
create policy identity_documents_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.identity_verifications (
  id uuid primary key default extensions.gen_random_uuid(),
  ninera_id uuid not null references public.profiles(id),
  document_storage_path text not null,
  status text not null default 'pendiente' check (status in ('pendiente','en_revision','aprobada','rechazada')),
  motivo text not null check (motivo in ('primera_vez','re-revision_por_edicion_de_perfil')),
  submitted_at timestamptz not null default now(), decided_at timestamptz,
  decided_by uuid references public.profiles(id), rejection_reason_code text, rejection_note text
);
alter table public.identity_verifications enable row level security;
create policy identity_verifications_select_own_or_admin on public.identity_verifications for select to authenticated
  using (ninera_id = auth.uid() or public.is_admin());

create or replace function public.submit_identity_verification(p_ninera_id uuid, p_document_storage_path text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_ninera_id uuid := p_ninera_id; v_status public.ninera_verification_status; v_motivo text;
begin
  if not exists (select 1 from public.profiles where id = v_ninera_id and role = 'ninera' and account_status = 'activa') then raise exception 'identity_verification_not_allowed'; end if;
  if not exists (select 1 from public.perfil_ninera where profile_id = v_ninera_id) then raise exception 'identity_verification_profile_required'; end if;
  if split_part(p_document_storage_path, '/', 1) <> v_ninera_id::text then raise exception 'identity_verification_path_not_owned'; end if;
  select verification_status into v_status from public.perfil_ninera where profile_id = v_ninera_id for update;
  v_motivo := case when v_status = 'verificada' then 're-revision_por_edicion_de_perfil' else 'primera_vez' end;
  insert into public.identity_verifications (ninera_id, document_storage_path, motivo) values (v_ninera_id, p_document_storage_path, v_motivo);
  update public.perfil_ninera set verification_status = 'en_proceso' where profile_id = v_ninera_id;
  insert into public.analytics_events (event_name, profile_id, ninera_id, metadata) values ('identity_verification_submitted', v_ninera_id, v_ninera_id, jsonb_build_object('ninera_id', v_ninera_id, 'motivo', v_motivo));
end; $$;
revoke execute on function public.submit_identity_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_identity_verification(uuid, text) to service_role;
