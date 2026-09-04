-- E5-04: paid, atomic contact confirmation.
-- Notifications are deliberately not attempted here: Epic 10's Resend/Twilio
-- infrastructure does not exist yet. The durable contacto/event transaction is the
-- handoff consumed by E10; delivery must be added as a non-blocking follow-up.

create table public.contacto (
  pipeline_id uuid primary key references public.pipeline(id),
  entitlement_id uuid not null references public.entitlements(id),
  mensaje text,
  created_at timestamptz not null default now()
);
alter table public.contacto enable row level security;
create policy contacto_family_own on public.contacto for select to authenticated
  using (exists (select 1 from public.pipeline pl join public.necesidades n on n.id = pl.necesidad_id
                 where pl.id = contacto.pipeline_id and n.familia_id = auth.uid()));

create or replace function public.confirm_contact(
  p_necesidad_id uuid,
  p_familia_id uuid,
  p_ninera_id uuid,
  p_mensaje text default null
) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pipeline public.pipeline;
  v_contact public.contacto;
  v_entitlement public.entitlements;
  v_phone text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_familia_id and role = 'familia' and account_status = 'activa'
      and email_verified = true and phone_verified = true
  ) then raise exception 'contact_not_allowed'; end if;

  if p_mensaje is not null and char_length(p_mensaje) > 1000 then
    raise exception 'invalid_contact_message';
  end if;

  -- Lock the pair so concurrent retries cannot create two contacts or observe a
  -- half-advanced pipeline.
  select pl.* into v_pipeline
  from public.pipeline pl
  join public.necesidades n on n.id = pl.necesidad_id
  where pl.necesidad_id = p_necesidad_id and pl.ninera_id = p_ninera_id
    and n.familia_id = p_familia_id and n.estado = 'activa'
  for update;
  if not found then raise exception 'contact_pair_not_allowed'; end if;

  -- A successful contact remains accessible for the lifetime of the owned pipeline.
  -- Check the durable relation before lifecycle/entitlement/eligibility gates so retries
  -- remain idempotent after E6 advances or discards the pipeline.
  select * into v_contact from public.contacto where pipeline_id = v_pipeline.id;
  if found then
    select phone into v_phone from public.profiles where id = p_ninera_id;
    return jsonb_build_object('status', 'already_contacted', 'pipeline_id', v_pipeline.id,
      'entitlement_id', v_contact.entitlement_id, 'phone', v_phone, 'mensaje', v_contact.mensaje);
  end if;

  if v_pipeline.estado <> 'nueva' then
    raise exception 'contact_pair_not_allowed';
  end if;

  -- Re-check current eligibility at the write boundary; a stale FAM-06 snapshot
  -- must never be enough to reveal contact data.
  if not exists (
    select 1 from public.necesidades n
    join public.zonas nz on nz.id = n.zona_id
    join public.perfil_ninera pn on pn.profile_id = p_ninera_id
    join public.profiles cp on cp.id = pn.profile_id
    where n.id = p_necesidad_id and n.familia_id = p_familia_id and n.estado = 'activa'
      and pn.publicado and pn.perfil_completo and cp.role = 'ninera' and cp.account_status = 'activa'
      and n.modalidad = any(pn.modalidades_aceptadas)
      and exists (select 1 from public.ninera_zonas nz2 join public.zonas z2 on z2.id = nz2.zona_id
                  where nz2.ninera_id = p_ninera_id and z2.alcaldia_municipio = nz.alcaldia_municipio)
      and pn.salario_min <= n.pago_max and pn.salario_max >= n.pago_min
      and pn.anos_experiencia >= 2
      and exists (select 1 from public.ninera_experiencia_edades ne join public.necesidad_children nc on nc.rango_edad = ne.rango_edad
                  where ne.ninera_id = p_ninera_id and nc.necesidad_id = n.id)
      and not exists (select 1 from jsonb_array_elements(n.dias_horarios) requested
                      where not exists (select 1 from jsonb_array_elements(pn.disponibilidad) available
                                        where available->>'dia' = requested->>'dia'
                                          and available->>'hora_inicio' < requested->>'hora_fin'
                                          and available->>'hora_fin' > requested->>'hora_inicio'))
  ) then raise exception 'candidate_not_eligible'; end if;

  select * into v_entitlement from public.entitlements
  where familia_id = p_familia_id and tier = 'contacto_30d' and expires_at > now()
  order by expires_at desc limit 1 for update;
  if not found then raise exception 'contact_entitlement_required'; end if;

  insert into public.contacto(pipeline_id, entitlement_id, mensaje)
  values (v_pipeline.id, v_entitlement.id, nullif(trim(p_mensaje), ''))
  returning * into v_contact;
  update public.pipeline set estado = 'contactada', updated_at = now() where id = v_pipeline.id;
  insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata)
  values ('candidate_contacted', p_familia_id, p_necesidad_id, p_ninera_id,
    jsonb_build_object('familia_id', p_familia_id, 'entitlement_id', v_entitlement.id));

  select phone into v_phone from public.profiles where id = p_ninera_id;
  return jsonb_build_object('status', 'contacted', 'pipeline_id', v_pipeline.id,
    'entitlement_id', v_entitlement.id, 'phone', v_phone, 'mensaje', v_contact.mensaje);
end; $$;

revoke execute on function public.confirm_contact(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_contact(uuid, uuid, uuid, text) to service_role;
