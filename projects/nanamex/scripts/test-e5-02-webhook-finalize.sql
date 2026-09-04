\set ON_ERROR_STOP on
begin;
delete from public.entitlements where familia_id='00000000-0000-0000-0000-000000000552';
delete from public.payments where familia_id='00000000-0000-0000-0000-000000000552';
delete from public.profiles where id='00000000-0000-0000-0000-000000000552';
delete from auth.users where id='00000000-0000-0000-0000-000000000552';
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token)
values ('00000000-0000-0000-0000-000000000552','authenticated','authenticated','e5-webhook@test.invalid','','');
insert into public.profiles (id,role,nombre) values ('00000000-0000-0000-0000-000000000552','familia','E5 Webhook');
commit;
set role service_role;

-- First payment: pendiente, awaiting finalization.
insert into public.payments (familia_id, provider, idempotency_key, amount, status, provider_payment_id)
values ('00000000-0000-0000-0000-000000000552','stripe','e5-02-idem-1',29900,'pendiente','cs_test_e5_02_first');

-- 1) A verified checkout.session.completed creates a new entitlement, 30 days from now().
do $$
declare
  r record;
begin
  select * into r from public.finalize_stripe_payment('cs_test_e5_02_first', 'exitoso');
  if r.already_finalized then raise exception 'first finalize should not be already_finalized'; end if;
  if r.entitlement_id is null then raise exception 'first finalize did not create an entitlement'; end if;
  if abs(extract(epoch from (r.expires_at - (now() + interval '30 days')))) > 5 then
    raise exception 'first entitlement expires_at not ~30 days from now(): %', r.expires_at;
  end if;
end $$;

do $$
declare c int;
begin
  select count(*) into c from public.payments where provider_payment_id = 'cs_test_e5_02_first' and status = 'exitoso';
  if c <> 1 then raise exception 'payment was not marked exitoso'; end if;
  select count(*) into c from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  if c <> 1 then raise exception 'expected exactly one entitlement row, found %', c; end if;
end $$;

-- 2) Redelivering the SAME webhook event must be a safe no-op: idempotent on
-- provider_payment_id (acceptance criterion) -- no second entitlement, no expiry extension.
do $$
declare
  r record;
  before_expiry timestamptz;
  after_expiry timestamptz;
  c int;
begin
  select expires_at into before_expiry from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  select * into r from public.finalize_stripe_payment('cs_test_e5_02_first', 'exitoso');
  if not r.already_finalized then raise exception 'redelivered webhook was not reported as already_finalized'; end if;
  select count(*) into c from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  if c <> 1 then raise exception 'redelivered webhook created a second entitlement (count=%)', c; end if;
  select expires_at into after_expiry from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  if before_expiry <> after_expiry then raise exception 'redelivered webhook extended expiry (before=% after=%)', before_expiry, after_expiry; end if;
end $$;

-- 3) Repurchase before expiry stacks: a second successful payment extends expires_at from
-- the CURRENT expiry, not from now() (acceptance criterion's explicit distinguishing test).
insert into public.payments (familia_id, provider, idempotency_key, amount, status, provider_payment_id)
values ('00000000-0000-0000-0000-000000000552','stripe','e5-02-idem-2',29900,'pendiente','cs_test_e5_02_second');
do $$
declare
  r record;
  prior_expiry timestamptz;
  c int;
begin
  select expires_at into prior_expiry from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  select * into r from public.finalize_stripe_payment('cs_test_e5_02_second', 'exitoso');
  if r.already_finalized then raise exception 'second finalize should not be already_finalized'; end if;
  select count(*) into c from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  if c <> 1 then raise exception 'repurchase created a duplicate/overlapping entitlement row (count=%)', c; end if;
  if abs(extract(epoch from (r.expires_at - (prior_expiry + interval '30 days')))) > 5 then
    raise exception 'stacked expiry not exactly 30 days after the PRIOR expiry (prior=% got=% expected~=%)',
      prior_expiry, r.expires_at, prior_expiry + interval '30 days';
  end if;
  -- The critical negative assertion: stacking must not equal "30 days from now()" (which
  -- would silently discard time the family already paid for).
  if abs(extract(epoch from (r.expires_at - (now() + interval '30 days')))) < 5 then
    raise exception 'stacked expiry looks like it was computed from now() instead of the prior expiry';
  end if;
end $$;

-- 4) A checkout.session.expired event marks the payment fallido and never touches entitlements.
insert into public.payments (familia_id, provider, idempotency_key, amount, status, provider_payment_id)
values ('00000000-0000-0000-0000-000000000552','stripe','e5-02-idem-3',29900,'pendiente','cs_test_e5_02_third');
do $$
declare
  r record;
  entitlement_count_before int;
  entitlement_count_after int;
begin
  select count(*) into entitlement_count_before from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  select * into r from public.finalize_stripe_payment('cs_test_e5_02_third', 'fallido');
  if r.entitlement_id is not null then raise exception 'a failed payment must never create/extend an entitlement'; end if;
  select count(*) into entitlement_count_after from public.entitlements where familia_id = '00000000-0000-0000-0000-000000000552';
  if entitlement_count_before <> entitlement_count_after then raise exception 'a failed payment changed the entitlement count'; end if;
end $$;
do $$ declare c int; begin
  select count(*) into c from public.payments where provider_payment_id = 'cs_test_e5_02_third' and status = 'fallido';
  if c <> 1 then raise exception 'payment was not marked fallido'; end if;
end $$;

-- 5) Redelivering a fallido event is also a safe no-op.
do $$
declare r record;
begin
  select * into r from public.finalize_stripe_payment('cs_test_e5_02_third', 'fallido');
  if not r.already_finalized then raise exception 'redelivered fallido event was not reported as already_finalized'; end if;
end $$;

-- 6) An unknown provider_payment_id (never created by this environment's checkout flow)
-- raises, rather than silently activating an entitlement from a bare event id.
do $$ declare failed boolean := false; begin
  begin perform public.finalize_stripe_payment('cs_test_e5_02_nonexistent', 'exitoso');
  exception when others then failed := true; end;
  if not failed then raise exception 'finalize accepted an unknown provider_payment_id'; end if;
end $$;

-- 7) No non-privileged role may call the finalize function directly.
reset role;
set role authenticated;
do $$ declare failed boolean := false; begin
  begin perform public.finalize_stripe_payment('cs_test_e5_02_first', 'exitoso');
  exception when insufficient_privilege then failed := true; end;
  if not failed then raise exception 'authenticated role was able to call finalize_stripe_payment directly'; end if;
end $$;
reset role;
