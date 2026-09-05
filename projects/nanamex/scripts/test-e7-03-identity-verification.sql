begin;
do $$ declare v_acl text; begin
  if not exists (select 1 from storage.buckets where id='identity-documents' and public=false) then raise exception 'private identity bucket missing'; end if;
  if not has_function_privilege('service_role', 'public.submit_identity_verification(uuid,text)', 'execute') then raise exception 'service role cannot submit'; end if;
  if has_function_privilege('authenticated', 'public.submit_identity_verification(uuid,text)', 'execute') then raise exception 'authenticated can submit directly'; end if;
  if exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('identity_documents_owner_insert','identity_documents_owner_update')) then raise exception 'owner Storage write policy still exists'; end if;
end $$;
create temporary table identity_test (ninera uuid, other_user uuid);
insert into identity_test values (gen_random_uuid(), gen_random_uuid());
insert into auth.users (id, aud, role, email, encrypted_password, confirmation_token)
select ninera, 'authenticated', 'authenticated', ninera::text||'@test.invalid', '', '' from identity_test
union all select other_user, 'authenticated', 'authenticated', other_user::text||'@test.invalid', '', '' from identity_test;
insert into public.profiles (id, role, nombre) select ninera, 'ninera', 'Identity test' from identity_test;
insert into public.perfil_ninera (profile_id, publicado, perfil_completo) select ninera, true, true from identity_test;
grant select on identity_test to service_role;
grant select on identity_test to authenticated;
insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('identity-documents', (select ninera::text from identity_test)||'/existing.jpg', (select ninera from identity_test), '{}'::jsonb);
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claim.sub', (select ninera::text from identity_test), true);
do $$ declare v_succeeded boolean := false; begin
  begin
    insert into storage.objects (bucket_id, name, owner_id, metadata)
      values ('identity-documents', (select ninera::text from identity_test)||'/arbitrary.pdf', (select ninera::text from identity_test), '{}'::jsonb);
    v_succeeded := true;
  exception when others then
    null;
  end;
  if v_succeeded then raise exception 'authenticated Storage insert bypassed server boundary'; end if;
end $$;
do $$ declare v_succeeded boolean := false; v_rows integer; begin
  begin
    update storage.objects set metadata = '{"owner_update": true}'::jsonb
      where bucket_id = 'identity-documents' and name = (select ninera::text from identity_test)||'/existing.jpg';
    get diagnostics v_rows = row_count;
    v_succeeded := v_rows > 0;
  exception when others then
    null;
  end;
  if v_succeeded then raise exception 'authenticated Storage update bypassed server boundary'; end if;
end $$;
select set_config('role', 'service_role', true);
select public.submit_identity_verification((select ninera from identity_test), (select ninera::text from identity_test)||'/document.jpg');
do $$ declare v_status text; v_row_status text; v_reason text; v_events int; begin
  select verification_status into v_status from public.perfil_ninera where profile_id=(select ninera from identity_test);
  select motivo into v_reason from public.identity_verifications where ninera_id=(select ninera from identity_test);
  select status into v_row_status from public.identity_verifications where ninera_id=(select ninera from identity_test);
  select count(*) into v_events from public.analytics_events where event_name='identity_verification_submitted' and ninera_id=(select ninera from identity_test);
  if v_status <> 'en_proceso' or v_row_status <> 'pendiente' or v_reason <> 'primera_vez' or v_events <> 1
     or not (select publicado from public.perfil_ninera where profile_id=(select ninera from identity_test)) then
    raise exception 'submission did not transition atomically';
  end if;
end $$;
-- Rejected submissions may be replaced and retain the first-review reason.
update public.identity_verifications set status = 'rechazada' where ninera_id=(select ninera from identity_test);
update public.perfil_ninera set verification_status = 'no_verificada' where profile_id=(select ninera from identity_test);
select public.submit_identity_verification((select ninera from identity_test), (select ninera::text from identity_test)||'/rejected-replacement.jpg');
do $$ declare v_reason text; begin
  select motivo into v_reason from public.identity_verifications where document_storage_path like '%/rejected-replacement.jpg';
  if v_reason <> 'primera_vez' then raise exception 'rejected resubmission reason incorrect'; end if;
end $$;
update public.identity_verifications set status = 'aprobada', decided_at = now() where ninera_id=(select ninera from identity_test) and status = 'pendiente';
update public.perfil_ninera set verification_status = 'verificada' where profile_id=(select ninera from identity_test);
select public.submit_identity_verification((select ninera from identity_test), (select ninera::text from identity_test)||'/verified-replacement.jpg');
do $$ declare v_reason text; begin
  select motivo into v_reason from public.identity_verifications where document_storage_path like '%/verified-replacement.jpg';
  if v_reason <> 're-revision_por_edicion_de_perfil' then raise exception 'verified replacement reason incorrect'; end if;
end $$;
do $$ declare v_succeeded boolean := false; begin
  begin
    select public.submit_identity_verification((select ninera from identity_test), (select ninera::text from identity_test)||'/duplicate.jpg');
    v_succeeded := true;
  exception when others then
    if sqlerrm <> 'identity_verification_already_in_process' then raise; end if;
  end;
  if v_succeeded then raise exception 'duplicate active submission was accepted'; end if;
end $$;
insert into public.profiles (id, role, nombre, account_status)
select other_user, 'ninera', 'Inactive identity test', 'suspendida' from identity_test;
do $$ declare v_succeeded boolean := false; begin
  begin
    select public.submit_identity_verification((select other_user from identity_test), (select other_user::text from identity_test)||'/inactive.jpg');
    v_succeeded := true;
  exception when others then
    if sqlerrm <> 'identity_verification_not_allowed' then raise; end if;
  end;
  if v_succeeded then raise exception 'inactive account submission was accepted'; end if;
end $$;
rollback;
