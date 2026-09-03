-- E2-01 draft storage. Publish constraints/matching are owned by E2-02.
create type public.necesidad_estado as enum ('borrador', 'activa', 'cerrada_contratada', 'cerrada_cancelada');
create table public.necesidades (
  id uuid primary key default extensions.gen_random_uuid(),
  familia_id uuid not null references public.profiles(id),
  zona_id uuid references public.zonas(id), dias_horarios jsonb,
  modalidad public.modalidad, pago_min integer, pago_max integer, fecha_inicio date,
  responsabilidades text[],
  estado public.necesidad_estado not null default 'borrador',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint necesidades_pago_order check (pago_min is null or pago_max is null or pago_min <= pago_max),
  unique (id, familia_id)
);
comment on table public.necesidades is 'Draft fields are nullable for step-by-step autosave; the E2-02 publication action must validate complete necesidad data before setting estado activa.';
create table public.necesidad_children (
  id uuid primary key default extensions.gen_random_uuid(), necesidad_id uuid not null references public.necesidades(id) on delete cascade,
  rango_edad public.rango_edad not null, unique (necesidad_id, id)
);

create or replace function public.save_necesidad_draft(p_draft_id uuid, p_familia_id uuid, p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_child jsonb;
begin
  if p_draft_id is not null then
    select id into v_id from public.necesidades where id = p_draft_id and familia_id = p_familia_id and estado = 'borrador' for update;
    if v_id is null then raise exception 'draft_not_editable'; end if;
  else v_id := extensions.gen_random_uuid(); end if;
  if jsonb_typeof(coalesce(p_payload->'children', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_payload->'children', '[]'::jsonb)) < 1 then raise exception 'children_required'; end if;
  if p_payload ? 'pagoMin' and p_payload ? 'pagoMax' and (p_payload->>'pagoMin')::integer > (p_payload->>'pagoMax')::integer then raise exception 'payment_order'; end if;
  insert into public.necesidades (id, familia_id, zona_id, dias_horarios, modalidad, pago_min, pago_max, fecha_inicio, responsabilidades, estado, updated_at)
  values (v_id, p_familia_id, nullif(p_payload->>'zonaId','')::uuid, p_payload->'diasHorarios', (p_payload->>'modalidad')::public.modalidad, (p_payload->>'pagoMin')::integer, (p_payload->>'pagoMax')::integer, (p_payload->>'fechaInicio')::date, array(select jsonb_array_elements_text(p_payload->'responsabilidades')), 'borrador', now())
  on conflict (id) do update set zona_id=excluded.zona_id, dias_horarios=excluded.dias_horarios, modalidad=excluded.modalidad, pago_min=excluded.pago_min, pago_max=excluded.pago_max, fecha_inicio=excluded.fecha_inicio, responsabilidades=excluded.responsabilidades, updated_at=now();
  delete from public.necesidad_children where necesidad_id = v_id;
  for v_child in select * from jsonb_array_elements(p_payload->'children') loop
    insert into public.necesidad_children (necesidad_id, rango_edad) values (v_id, (v_child #>> '{}')::public.rango_edad);
  end loop;
  return v_id;
end; $$;
revoke execute on function public.save_necesidad_draft(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_necesidad_draft(uuid, uuid, jsonb) to service_role;
alter table public.necesidades enable row level security;
create policy necesidades_family_own on public.necesidades for all to authenticated
  using (familia_id = auth.uid()) with check (familia_id = auth.uid());
alter table public.necesidad_children enable row level security;
create policy necesidad_children_family_own on public.necesidad_children for all to authenticated
  using (exists (select 1 from public.necesidades n where n.id = necesidad_id and n.familia_id = auth.uid()))
  with check (exists (select 1 from public.necesidades n where n.id = necesidad_id and n.familia_id = auth.uid()));
create index necesidades_familia_estado_idx on public.necesidades(familia_id, estado);
