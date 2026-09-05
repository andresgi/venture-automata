-- E7-02 / NIN-07: section-level profile edits.
-- A re-review deliberately references the same stored document, so historical verification
-- rows may share a path. The one-active-submission index still prevents duplicate review work.
drop index if exists public.identity_verifications_document_path_unique;
create or replace function public.save_perfil_ninera_section(p_ninera_id uuid, p_section text, p_payload jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_status public.ninera_verification_status; v_complete boolean; v_identity_changed boolean := false; v_old_photo text; v_old_name text; v_document_path text; v_item jsonb;
begin
  if not exists (select 1 from public.profiles where id=p_ninera_id and role='ninera' and account_status='activa') then raise exception 'perfil_ninera_edit_not_allowed'; end if;
  if p_section not in ('identity','work','availability','about','references') then raise exception 'perfil_ninera_edit_section_invalid'; end if;
  select verification_status into v_status from public.perfil_ninera where profile_id=p_ninera_id for update;
  if not found then raise exception 'perfil_ninera_required'; end if;
  if p_section='identity' then
    select nombre into v_old_name from public.profiles where id=p_ninera_id;
    select foto_url into v_old_photo from public.perfil_ninera where profile_id=p_ninera_id;
    v_identity_changed := (p_payload ? 'nombre') and (p_payload->>'nombre') is distinct from v_old_name;
    update public.profiles set nombre=trim(p_payload->>'nombre') where id=p_ninera_id;
    update public.perfil_ninera set foto_url=nullif(trim(p_payload->>'fotoUrl'),'') where profile_id=p_ninera_id;
    v_identity_changed := v_identity_changed or (p_payload ? 'fotoUrl') and (nullif(trim(p_payload->>'fotoUrl'),'') is distinct from v_old_photo);
  elsif p_section='work' then
    update public.perfil_ninera set anos_experiencia=(p_payload->>'anosExperiencia')::int where profile_id=p_ninera_id;
    delete from public.ninera_zonas where ninera_id=p_ninera_id;
    insert into public.ninera_zonas (ninera_id,zona_id) select p_ninera_id,(value #>> '{}')::uuid from jsonb_array_elements(coalesce(p_payload->'zonaIds','[]')) value;
    delete from public.ninera_experiencia_edades where ninera_id=p_ninera_id;
    insert into public.ninera_experiencia_edades (ninera_id,rango_edad) select p_ninera_id,(value #>> '{}')::public.rango_edad from jsonb_array_elements(coalesce(p_payload->'experienciaEdades','[]')) value;
  elsif p_section='availability' then
    if jsonb_typeof(coalesce(p_payload->'disponibilidad','[]'::jsonb)) <> 'array' then raise exception 'perfil_ninera_invalid_availability'; end if;
    for v_item in select value from jsonb_array_elements(coalesce(p_payload->'disponibilidad','[]'::jsonb)) loop
      if jsonb_typeof(v_item) <> 'object' or not (v_item ? 'dia') or not (v_item ? 'hora_inicio') or not (v_item ? 'hora_fin')
         or v_item->>'dia' not in ('lun','mar','mie','jue','vie','sab','dom')
         or (v_item->>'hora_inicio') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (v_item->>'hora_fin') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
         or (v_item->>'hora_inicio') >= (v_item->>'hora_fin') then
        raise exception 'perfil_ninera_invalid_availability';
      end if;
    end loop;
    update public.perfil_ninera set disponibilidad=coalesce(p_payload->'disponibilidad','[]'), salario_min=(p_payload->>'salarioMin')::int, salario_max=(p_payload->>'salarioMax')::int,
      modalidades_aceptadas=(select coalesce(array_agg((value #>> '{}')::public.modalidad),'{}') from jsonb_array_elements(coalesce(p_payload->'modalidadesAceptadas','[]')) value) where profile_id=p_ninera_id;
  elsif p_section='about' then update public.perfil_ninera set descripcion=nullif(trim(p_payload->>'descripcion'),'') where profile_id=p_ninera_id;
  elsif p_section='references' then
    delete from public.referencias where ninera_id=p_ninera_id;
    insert into public.referencias (ninera_id,nombre,relacion,periodo,contacto) select p_ninera_id,value->>'nombre',value->>'relacion',value->>'periodo',nullif(value->>'contacto','') from jsonb_array_elements(coalesce(p_payload->'referencias','[]')) value;
  end if;
  if v_status='verificada' and v_identity_changed then
    select document_storage_path into v_document_path from public.identity_verifications where ninera_id=p_ninera_id and document_storage_path is not null order by submitted_at desc,id desc limit 1;
    if v_document_path is null then raise exception 'identity_verification_document_required'; end if;
    insert into public.identity_verifications (ninera_id,document_storage_path,status,motivo) values (p_ninera_id,v_document_path,'pendiente','re-revision_por_edicion_de_perfil');
    update public.perfil_ninera set verification_status='en_proceso' where profile_id=p_ninera_id;
    insert into public.analytics_events (event_name,profile_id,ninera_id,metadata) values ('identity_verification_submitted',p_ninera_id,p_ninera_id,jsonb_build_object('ninera_id',p_ninera_id,'motivo','re-revision_por_edicion_de_perfil'));
  end if;
  select coalesce(array_length((select array_agg(zona_id) from public.ninera_zonas where ninera_id=p_ninera_id),1)>0,false)
    and jsonb_array_length(coalesce((select disponibilidad from public.perfil_ninera where profile_id=p_ninera_id),'[]'))>0
    and coalesce(array_length((select modalidades_aceptadas from public.perfil_ninera where profile_id=p_ninera_id),1)>0,false)
    and (select salario_min is not null and salario_max is not null and descripcion is not null from public.perfil_ninera where profile_id=p_ninera_id)
    and exists (select 1 from public.ninera_experiencia_edades where ninera_id=p_ninera_id) into v_complete;
  update public.perfil_ninera set perfil_completo=v_complete,publicado=v_complete where profile_id=p_ninera_id;
  return v_complete;
end; $$;
revoke execute on function public.save_perfil_ninera_section(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_perfil_ninera_section(uuid,text,jsonb) to service_role;
