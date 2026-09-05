-- E7-03 Code Review hardening.
-- Identity documents are written only by the server-side, validated action.  The
-- private bucket remains readable by admins only; owners cannot insert or replace
-- objects through the browser Storage API.
drop policy if exists identity_documents_owner_insert on storage.objects;
drop policy if exists identity_documents_owner_update on storage.objects;

-- A row in either of these states is an active review.  This is also a defense
-- against a future service-side caller bypassing the RPC's explicit check.
create unique index if not exists identity_verifications_one_active_submission
  on public.identity_verifications (ninera_id)
  where status in ('pendiente', 'en_revision');
create unique index if not exists identity_verifications_document_path_unique
  on public.identity_verifications (document_storage_path);

create or replace function public.submit_identity_verification(p_ninera_id uuid, p_document_storage_path text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_status public.ninera_verification_status;
  v_motivo text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_ninera_id and role = 'ninera' and account_status = 'activa'
  ) then
    raise exception 'identity_verification_not_allowed';
  end if;

  if not exists (select 1 from public.perfil_ninera where profile_id = p_ninera_id) then
    raise exception 'identity_verification_profile_required';
  end if;

  if split_part(p_document_storage_path, '/', 1) <> p_ninera_id::text
     or split_part(p_document_storage_path, '/', 2) = '' then
    raise exception 'identity_verification_path_not_owned';
  end if;

  -- Serializes retries and concurrent submissions for this niñera.
  select verification_status into v_status
    from public.perfil_ninera where profile_id = p_ninera_id for update;

  if v_status = 'en_proceso'
     or exists (
       select 1 from public.identity_verifications
       where ninera_id = p_ninera_id and status in ('pendiente', 'en_revision')
     ) then
    raise exception 'identity_verification_already_in_process';
  end if;

  v_motivo := case when v_status = 'verificada'
    then 're-revision_por_edicion_de_perfil' else 'primera_vez' end;

  insert into public.identity_verifications (ninera_id, document_storage_path, motivo)
    values (p_ninera_id, p_document_storage_path, v_motivo);
  update public.perfil_ninera set verification_status = 'en_proceso'
    where profile_id = p_ninera_id;
  insert into public.analytics_events (event_name, profile_id, ninera_id, metadata)
    values ('identity_verification_submitted', p_ninera_id, p_ninera_id,
      jsonb_build_object('ninera_id', p_ninera_id, 'motivo', v_motivo));
end; $$;

revoke execute on function public.submit_identity_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_identity_verification(uuid, text) to service_role;
