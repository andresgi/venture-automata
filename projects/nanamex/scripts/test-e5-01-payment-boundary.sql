\set ON_ERROR_STOP on
begin;
delete from public.payments where familia_id='00000000-0000-0000-0000-000000000551';
delete from public.profiles where id='00000000-0000-0000-0000-000000000551';
delete from auth.users where id='00000000-0000-0000-0000-000000000551';
insert into auth.users (id,aud,role,email,encrypted_password,confirmation_token)
values ('00000000-0000-0000-0000-000000000551','authenticated','authenticated','e5-boundary@test.invalid','','');
insert into public.profiles (id,role,nombre) values ('00000000-0000-0000-0000-000000000551','familia','E5 Boundary');
commit;
set role service_role;

-- Nullable provider ID and the documented provider/session status domains are executable checks.
insert into public.payments (familia_id, provider, idempotency_key, amount, status, provider_payment_id)
values ('00000000-0000-0000-0000-000000000551','stripe','nullable-provider-id',29900,'pendiente',null);
do $$ declare failed boolean := false; begin
  begin insert into public.payments (familia_id, provider, idempotency_key, amount) values ('00000000-0000-0000-0000-000000000551','mercado-pago','bad-provider',29900); exception when check_violation then failed := true; end;
  if not failed then raise exception 'provider check accepted a non-Stripe provider'; end if;
end $$;
do $$ declare failed boolean := false; begin
  begin update public.payments set provider_session_status='bogus' where idempotency_key='nullable-provider-id'; exception when check_violation then failed := true; end;
  if not failed then raise exception 'session status check accepted an unknown value'; end if;
end $$;

-- Idempotency is durable even across finalized rows; pending uniqueness is family-scoped and partial.
do $$ declare failed boolean := false; begin
  begin insert into public.payments (familia_id, provider, idempotency_key, amount, status) values ('00000000-0000-0000-0000-000000000551','stripe','nullable-provider-id',29900,'exitoso'); exception when unique_violation then failed := true; end;
  if not failed then raise exception 'duplicate idempotency key accepted'; end if;
end $$;
do $$ declare failed boolean := false; begin
  begin insert into public.payments (familia_id, provider, idempotency_key, amount, status) values ('00000000-0000-0000-0000-000000000551','stripe','second-pending',29900,'pendiente'); exception when unique_violation then failed := true; end;
  if not failed then raise exception 'second pending family boundary accepted'; end if;
end $$;
insert into public.payments (familia_id, provider, idempotency_key, amount, status) values ('00000000-0000-0000-0000-000000000551','stripe','non-pending-allowed',29900,'fallido');
