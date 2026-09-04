-- E5-01 payment boundary. The local row is durable before Stripe is called. Stripe metadata
-- carries the boundary id so E5-02 can reconcile even if the post-create update is interrupted.
alter table public.payments
  alter column provider_payment_id drop not null,
  add column idempotency_key text not null default extensions.gen_random_uuid()::text,
  add column checkout_url text,
  add column provider_session_status text not null default 'not_created',
  add column provider_session_expires_at timestamptz,
  add column checkout_claimed_at timestamptz;

alter table public.payments add constraint payments_provider_stripe_check check (provider = 'stripe');
alter table public.payments add constraint payments_provider_session_status_check
  check (provider_session_status in ('not_created', 'open', 'expired', 'complete', 'unknown'));
create unique index payments_idempotency_key_idx on public.payments (idempotency_key);
create unique index payments_one_pending_per_familia_idx
  on public.payments (familia_id) where status = 'pendiente';

comment on column public.payments.idempotency_key is
  'Durable local/Stripe idempotency boundary. Also sent as Stripe request idempotency key.';
comment on column public.payments.checkout_url is
  'Stripe hosted URL, stored after creation for safe retries; may be null during recovery.';
