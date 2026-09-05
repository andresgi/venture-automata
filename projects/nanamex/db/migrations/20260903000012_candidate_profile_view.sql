-- E4-03 owns the durable analytics_events table. E11-01 must consume and extend
-- this schema; it must not recreate the table. PostHog capture is intentionally
-- deferred to E11-01. This function remains the durable write-side boundary.
create table public.analytics_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_name text not null,
  profile_id uuid references public.profiles(id),
  necesidad_id uuid references public.necesidades(id),
  ninera_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;
create unique index analytics_compatible_match_once
  on public.analytics_events(event_name, necesidad_id, ninera_id)
  where event_name = 'compatible_match_found';

create or replace function public.record_candidate_profile_view(
  p_necesidad_id uuid,
  p_familia_id uuid,
  p_ninera_id uuid,
  p_match_score integer,
  p_match_checklist jsonb
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  -- Keep this aligned with architecture.md §15.3. Update this named constant
  -- and its integration tests together if the product threshold changes.
  v_compatible_threshold constant integer := 60;
begin
  if not exists (
    select 1 from public.necesidades
    where id = p_necesidad_id and familia_id = p_familia_id and estado = 'activa'
  ) then raise exception 'candidate_view_not_allowed'; end if;
  if not exists (
    select 1 from public.perfil_ninera pn
    join public.profiles p on p.id = pn.profile_id
    where pn.profile_id = p_ninera_id and pn.publicado = true
      and pn.perfil_completo = true and p.account_status = 'activa'
  ) then raise exception 'candidate_not_available'; end if;
  if p_match_score not between 0 and 100 then raise exception 'invalid_match_score'; end if;

  insert into public.pipeline(necesidad_id, ninera_id, estado, match_score_snapshot, match_checklist_snapshot, source)
  values (p_necesidad_id, p_ninera_id, 'nueva', p_match_score, coalesce(p_match_checklist, '{}'::jsonb), 'family_view')
  on conflict (necesidad_id, ninera_id) do nothing;

  insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata)
  values ('candidate_profile_viewed', p_familia_id, p_necesidad_id, p_ninera_id,
          jsonb_build_object('match_score', p_match_score));

   if p_match_score >= v_compatible_threshold then
    insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata)
    values ('compatible_match_found', p_familia_id, p_necesidad_id, p_ninera_id,
            jsonb_build_object('match_score', p_match_score, 'familia_id', p_familia_id))
    on conflict (event_name, necesidad_id, ninera_id) where event_name = 'compatible_match_found' do nothing;
  end if;
end; $$;

revoke execute on function public.record_candidate_profile_view(uuid, uuid, uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_candidate_profile_view(uuid, uuid, uuid, integer, jsonb)
  to service_role;
