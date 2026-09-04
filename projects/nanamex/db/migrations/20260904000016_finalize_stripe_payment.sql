-- E5-02 (Stripe webhook handler): the single atomic finalize step that transitions a
-- `payments` row out of `pendiente` and, on success, creates/extends the account-wide
-- `contacto_30d` entitlement (architecture.md §16.1, database.md §8/§9). Mirrors E4-03's
-- `record_candidate_profile_view` / E4-04's `set_candidate_favorite` trust-boundary pattern:
-- a SECURITY DEFINER function callable only by `service_role`, so the webhook route handler
-- (the only caller) never needs direct table-write access, and no other code path can ever
-- write `payments.status`/`entitlements.*` outside this function.
--
-- Idempotency (database.md §9: "the webhook handler is the only writer of `status`, keyed by
-- `provider_payment_id`"): the single `update ... where status = 'pendiente' ... returning`
-- statement below is both the state transition *and* the idempotency guard in one atomic
-- step -- a redelivered webhook for an already-finalized payment updates zero rows, so the
-- function returns `already_finalized = true` without ever touching `entitlements`.
--
-- Stacking (architecture.md §16.1): on a successful payment, extends the family's *current*
-- active entitlement's `expires_at` by 30 days from that existing `expires_at` -- never from
-- `now()` -- so a renewal before expiry never shortens what the family already had. Only
-- when no currently-active entitlement exists does a fresh row start its 30-day window from
-- `now()`. `select ... for update` on the candidate entitlement row serializes concurrent
-- finalizations for the same family so two near-simultaneous successful payments can never
-- both read the same pre-extension `expires_at`.
create or replace function public.finalize_stripe_payment(
  p_provider_payment_id text,
  p_outcome public.payment_status
) returns table (
  payment_id uuid,
  familia_id uuid,
  already_finalized boolean,
  entitlement_id uuid,
  expires_at timestamptz
) language plpgsql security definer set search_path = public, extensions as $$
declare
  v_payment_id uuid;
  v_familia_id uuid;
  v_amount integer;
  v_active_entitlement_id uuid;
  v_active_expires_at timestamptz;
  v_new_entitlement_id uuid;
  v_new_expires_at timestamptz;
begin
  if p_outcome not in ('exitoso', 'fallido') then
    raise exception 'invalid_outcome';
  end if;

  -- Atomic transition + idempotency guard: only a currently-`pendiente` row is finalized.
  -- Every selected/returned column below is explicitly table-qualified (`p.*`/`e.*`) because
  -- this function's `returns table (...)` clause implicitly declares OUT parameters named
  -- `familia_id`/`entitlement_id`/`expires_at`, which would otherwise be ambiguous against
  -- the identically-named table columns in these queries (caught by npm run test:db).
  update public.payments p
    set status = p_outcome
    where p.provider_payment_id = p_provider_payment_id and p.status = 'pendiente'
    returning p.id, p.familia_id, p.amount into v_payment_id, v_familia_id, v_amount;

  if v_payment_id is null then
    -- Either this payment was already finalized by a prior delivery (safe no-op, per
    -- database.md §9), or `provider_payment_id` never matched any row.
    select p.id, p.familia_id into v_payment_id, v_familia_id
      from public.payments p where p.provider_payment_id = p_provider_payment_id;
    if v_payment_id is null then
      raise exception 'payment_not_found';
    end if;
    return query select v_payment_id, v_familia_id, true, null::uuid, null::timestamptz;
    return;
  end if;

  if p_outcome = 'fallido' then
    insert into public.analytics_events(event_name, profile_id, metadata)
    values ('payment_failed', v_familia_id, jsonb_build_object('payment_id', v_payment_id));
    return query select v_payment_id, v_familia_id, false, null::uuid, null::timestamptz;
    return;
  end if;

  -- p_outcome = 'exitoso': create or stack the account-wide entitlement.
  select e.id, e.expires_at into v_active_entitlement_id, v_active_expires_at
    from public.entitlements e
    where e.familia_id = v_familia_id and e.expires_at > now()
    order by e.expires_at desc
    limit 1
    for update;

  if v_active_entitlement_id is null then
    v_new_expires_at := now() + interval '30 days';
    insert into public.entitlements (familia_id, tier, activated_at, expires_at, payment_id, status)
    values (v_familia_id, 'contacto_30d', now(), v_new_expires_at, v_payment_id, 'activo')
    returning entitlements.id into v_new_entitlement_id;
  else
    v_new_entitlement_id := v_active_entitlement_id;
    v_new_expires_at := v_active_expires_at + interval '30 days';
    update public.entitlements e
      set expires_at = v_new_expires_at, payment_id = v_payment_id, status = 'activo'
      where e.id = v_active_entitlement_id;
  end if;

  insert into public.analytics_events(event_name, profile_id, metadata)
  values ('payment_succeeded', v_familia_id, jsonb_build_object(
    'payment_id', v_payment_id, 'entitlement_id', v_new_entitlement_id, 'amount', v_amount
  ));

  return query select v_payment_id, v_familia_id, false, v_new_entitlement_id, v_new_expires_at;
end; $$;

revoke execute on function public.finalize_stripe_payment(text, public.payment_status)
  from public, anon, authenticated;
grant execute on function public.finalize_stripe_payment(text, public.payment_status)
  to service_role;
