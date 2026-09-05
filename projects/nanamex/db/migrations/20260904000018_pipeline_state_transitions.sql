-- E6-01: FAM-11 manual pipeline transitions ("Avanzar estado" / "Descartar").
--
-- `nueva -> contactada` remains exclusively owned by E5-04's `confirm_contact` RPC (the
-- paid contact flow). This function must never be able to produce that transition, so it
-- hard-rejects `p_new_estado = 'contactada'` (and `'nueva'`, which is never a valid target
-- either way) before doing anything else, regardless of the pipeline row's current state.
--
-- Allowed manual forward path: contactada -> entrevista -> contratada. "Descartar" moves
-- any non-terminal state (including nueva) to descartada, per UX-spec.md FAM-11
-- ("Descartar is available from any state, including Nueva"); calling it again on an
-- already-descartada row is a no-op, matching the idempotent-retry pattern already used by
-- `confirm_contact`.
--
-- Notifications: per UX-spec.md, "every subsequent state change notifies the niñera."
-- Epic 10's Resend/Twilio delivery infrastructure does not exist yet (see E5-04's own
-- documented handoff, agent/DECISIONS.md "E5-04 notification handoff narrowed"). This
-- function records the durable `pipeline_state_advanced` analytics event
-- (engineering/analytics.md) as the handoff for E10 to consume; it does not attempt actual
-- delivery or invent a notification queue.
create or replace function public.advance_pipeline_state(
  p_pipeline_id uuid,
  p_familia_id uuid,
  p_new_estado public.pipeline_estado
) returns public.pipeline language plpgsql security definer set search_path = public, extensions as $$
declare
  v_pipeline public.pipeline;
  v_from_estado public.pipeline_estado;
begin
  if p_new_estado = 'contactada' or p_new_estado = 'nueva' then
    raise exception 'transition_not_allowed';
  end if;

  select pl.* into v_pipeline
  from public.pipeline pl
  join public.necesidades n on n.id = pl.necesidad_id
  where pl.id = p_pipeline_id and n.familia_id = p_familia_id
  for update;
  if not found then raise exception 'pipeline_not_found'; end if;

  v_from_estado := v_pipeline.estado;

  if p_new_estado = 'descartada' then
    if v_from_estado = 'descartada' then
      return v_pipeline;
    end if;
  elsif p_new_estado = 'entrevista' then
    if v_from_estado <> 'contactada' then raise exception 'transition_not_allowed'; end if;
  elsif p_new_estado = 'contratada' then
    if v_from_estado <> 'entrevista' then raise exception 'transition_not_allowed'; end if;
  else
    raise exception 'transition_not_allowed';
  end if;

  update public.pipeline set estado = p_new_estado, updated_at = now()
  where id = p_pipeline_id
  returning * into v_pipeline;

  insert into public.analytics_events(event_name, profile_id, necesidad_id, ninera_id, metadata)
  values ('pipeline_state_advanced', p_familia_id, v_pipeline.necesidad_id, v_pipeline.ninera_id,
    jsonb_build_object('pipeline_id', v_pipeline.id, 'from_estado', v_from_estado, 'to_estado', p_new_estado));

  return v_pipeline;
end; $$;

revoke execute on function public.advance_pipeline_state(uuid, uuid, public.pipeline_estado) from public, anon, authenticated;
grant execute on function public.advance_pipeline_state(uuid, uuid, public.pipeline_estado) to service_role;
