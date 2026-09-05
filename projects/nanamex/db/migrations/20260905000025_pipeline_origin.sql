-- E7-05 provenance. Existing rows cannot be reconstructed safely, so they are explicitly
-- marked unknown rather than being presented as pushed opportunities.
create type public.pipeline_origin as enum ('pushed', 'family_view', 'family_favorite', 'unknown');

alter table public.pipeline add column source public.pipeline_origin not null default 'unknown';

-- Keep all creation paths explicit for fresh databases. The function bodies are repeated here
-- because these functions were already deployed by earlier migrations; CREATE OR REPLACE is
-- required to update the hosted database as well as a fresh reset.
create or replace function public.publish_necesidad_with_matches(p_necesidad_id uuid, p_familia_id uuid, p_matches jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_necesidad public.necesidades; v_match jsonb;
begin
  select * into v_necesidad from public.necesidades where id = p_necesidad_id and familia_id = p_familia_id and estado = 'borrador' for update;
  if not found then raise exception 'draft_not_publishable'; end if;
  if v_necesidad.zona_id is null or v_necesidad.modalidad is null or v_necesidad.dias_horarios is null or jsonb_array_length(v_necesidad.dias_horarios) < 1 or v_necesidad.pago_min is null or v_necesidad.pago_max is null or v_necesidad.fecha_inicio is null or v_necesidad.fecha_inicio < current_date or v_necesidad.responsabilidades is null or cardinality(v_necesidad.responsabilidades) < 1 or not exists (select 1 from public.necesidad_children c where c.necesidad_id = v_necesidad.id) then raise exception 'necesidad_incomplete'; end if;
  update public.necesidades set estado = 'activa', updated_at = now() where id = v_necesidad.id;
  for v_match in select * from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb)) loop
    if not exists (select 1 from public.perfil_ninera pn join public.profiles p on p.id = pn.profile_id where pn.profile_id = (v_match->>'ninera_id')::uuid and pn.publicado = true and pn.perfil_completo = true and p.account_status = 'activa') then raise exception 'invalid_match_candidate: % is not an eligible published niñera', v_match->>'ninera_id'; end if;
    if (v_match->>'match_score_snapshot')::integer not between 0 and 100 then raise exception 'invalid_match_score: % is out of range', v_match->>'match_score_snapshot'; end if;
    insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, source)
    values (v_necesidad.id, (v_match->>'ninera_id')::uuid, 'nueva', (v_match->>'match_score_snapshot')::integer, v_match->'match_checklist_snapshot', 'pushed') on conflict (necesidad_id, ninera_id) do nothing;
  end loop;
  return v_necesidad.id;
end; $$;

create or replace function public.record_candidate_profile_view(p_necesidad_id uuid, p_familia_id uuid, p_ninera_id uuid, p_match_score integer, p_match_checklist jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_compatible_threshold constant integer := 60;
begin
  if not exists (select 1 from public.necesidades where id = p_necesidad_id and familia_id = p_familia_id and estado = 'activa') then raise exception 'candidate_view_not_allowed'; end if;
  if not exists (select 1 from public.perfil_ninera pn join public.profiles p on p.id = pn.profile_id where pn.profile_id = p_ninera_id and pn.publicado = true and pn.perfil_completo = true and p.account_status = 'activa') then raise exception 'candidate_not_available'; end if;
  if p_match_score not between 0 and 100 then raise exception 'invalid_match_score'; end if;
  insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, source) values (p_necesidad_id, p_ninera_id, 'nueva', p_match_score, coalesce(p_match_checklist, '{}'::jsonb), 'family_view') on conflict (necesidad_id, ninera_id) do nothing;
  insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata) values ('candidate_profile_viewed', p_familia_id, p_necesidad_id, p_ninera_id, jsonb_build_object('match_score', p_match_score));
  if p_match_score >= v_compatible_threshold then insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata) values ('compatible_match_found', p_familia_id, p_necesidad_id, p_ninera_id, jsonb_build_object('match_score', p_match_score, 'familia_id', p_familia_id)) on conflict (event_name, necesidad_id, ninera_id) where event_name = 'compatible_match_found' do nothing; end if;
end; $$;

create or replace function public.set_candidate_favorite(p_necesidad_id uuid, p_familia_id uuid, p_ninera_id uuid, p_favorite boolean, p_match_score integer, p_match_checklist jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from public.necesidades where id = p_necesidad_id and familia_id = p_familia_id and estado = 'activa') then raise exception 'candidate_view_not_allowed'; end if;
  if p_favorite then
    if not exists (select 1 from public.perfil_ninera pn join public.profiles p on p.id = pn.profile_id where pn.profile_id = p_ninera_id and pn.publicado = true and pn.perfil_completo = true and p.account_status = 'activa') then raise exception 'candidate_not_available'; end if;
    if p_match_score not between 0 and 100 then raise exception 'invalid_match_score'; end if;
    insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, es_favorita, source) values (p_necesidad_id, p_ninera_id, 'nueva', p_match_score, coalesce(p_match_checklist, '{}'::jsonb), true, 'family_favorite') on conflict (necesidad_id, ninera_id) do update set es_favorita = true, updated_at = now();
  else update public.pipeline set es_favorita = false, updated_at = now() where necesidad_id = p_necesidad_id and ninera_id = p_ninera_id;
  end if;
end; $$;
