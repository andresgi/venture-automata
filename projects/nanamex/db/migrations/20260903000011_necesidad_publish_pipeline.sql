-- E2-02: the initial match is a frozen pipeline snapshot, created atomically with publish.
create type public.pipeline_estado as enum ('nueva', 'contactada', 'entrevista', 'contratada', 'descartada');

create table public.pipeline (
  id uuid primary key default extensions.gen_random_uuid(),
  necesidad_id uuid not null references public.necesidades(id),
  ninera_id uuid not null references public.profiles(id),
  estado public.pipeline_estado not null default 'nueva',
  match_score_snapshot integer not null,
  match_checklist_snapshot jsonb not null,
  interes_ninera boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (necesidad_id, ninera_id)
);

create index pipeline_necesidad_idx on public.pipeline(necesidad_id);
alter table public.pipeline enable row level security;
create policy pipeline_family_own on public.pipeline for select to authenticated
  using (exists (select 1 from public.necesidades n where n.id = pipeline.necesidad_id and n.familia_id = auth.uid()));

create or replace function public.publish_necesidad_with_matches(p_necesidad_id uuid, p_familia_id uuid, p_matches jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_necesidad public.necesidades; v_match jsonb;
begin
  select * into v_necesidad from public.necesidades where id = p_necesidad_id and familia_id = p_familia_id and estado = 'borrador' for update;
  if not found then raise exception 'draft_not_publishable'; end if;
  if v_necesidad.zona_id is null or v_necesidad.modalidad is null or v_necesidad.dias_horarios is null
     or jsonb_array_length(v_necesidad.dias_horarios) < 1 or v_necesidad.pago_min is null or v_necesidad.pago_max is null
     or v_necesidad.fecha_inicio is null or v_necesidad.fecha_inicio < current_date
     or v_necesidad.responsabilidades is null or cardinality(v_necesidad.responsabilidades) < 1
     or not exists (select 1 from public.necesidad_children c where c.necesidad_id = v_necesidad.id)
  then raise exception 'necesidad_incomplete'; end if;
  update public.necesidades set estado = 'activa', updated_at = now() where id = v_necesidad.id;
  for v_match in select * from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb)) loop
    -- This function is SECURITY DEFINER and is the sole atomic persistence step for the
    -- pipeline snapshot, so it is itself the trust boundary -- it must not assume the
    -- caller (application code today, potentially a different caller in the future)
    -- already enforced niñera eligibility. Re-check the same publish-eligibility
    -- criteria the app uses to build candidates (published, complete, active account)
    -- and the score range here, and raise rather than silently skip: a fabricated
    -- snapshot or an ineligible/nonexistent candidate id indicates a caller bug or a
    -- compromised/misused trust boundary, not a transient data condition, so failing
    -- the whole publish (and rolling back the `borrador` -> `activa` transition with it)
    -- is more correct than quietly publishing a partially-wrong result.
    if not exists (
      select 1 from public.perfil_ninera pn
      join public.profiles p on p.id = pn.profile_id
      where pn.profile_id = (v_match->>'ninera_id')::uuid
        and pn.publicado = true
        and pn.perfil_completo = true
        and p.account_status = 'activa'
    ) then
      raise exception 'invalid_match_candidate: % is not an eligible published niñera', v_match->>'ninera_id';
    end if;
    if (v_match->>'match_score_snapshot')::integer not between 0 and 100 then
      raise exception 'invalid_match_score: % is out of range', v_match->>'match_score_snapshot';
    end if;
    insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot)
    values (v_necesidad.id, (v_match->>'ninera_id')::uuid, 'nueva', (v_match->>'match_score_snapshot')::integer, v_match->'match_checklist_snapshot')
    on conflict (necesidad_id, ninera_id) do nothing;
  end loop;
  return v_necesidad.id;
end; $$;
revoke execute on function public.publish_necesidad_with_matches(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.publish_necesidad_with_matches(uuid, uuid, jsonb) to service_role;
