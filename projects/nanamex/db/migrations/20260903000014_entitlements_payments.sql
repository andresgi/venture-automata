-- entitlements/payments (engineering/database.md §8/§9; architecture.md §16). Backs E5-01's
-- checkout-session creation and E5-02's webhook-driven activation. Both tables are
-- system-owned end to end (database.md: "Ownership: system") -- a family only ever *reads*
-- its own rows; every write comes from server code holding the service-role key
-- (`createCheckoutSession` inserts `payments` rows; the E5-02 webhook handler is the only
-- writer of `payments.status`/`entitlements.*`). No insert/update policy is defined for the
-- `authenticated` role below, so RLS default-denies any direct client write as
-- defense-in-depth (mirrors database.md §14's stated intent), on top of the primary
-- authorization boundary (architecture.md §3: the app never queries Supabase directly from
-- the browser).

create type public.payment_status as enum ('pendiente', 'exitoso', 'fallido');
create type public.entitlement_tier as enum ('contacto_30d');
create type public.entitlement_status as enum ('activo', 'expirado');

create table public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  familia_id uuid not null references public.profiles(id),
  provider text not null default 'stripe',
  -- Stripe Checkout Session ID at creation time (E5-01); idempotency key for the E5-02
  -- webhook handler (database.md §9: "a redelivered webhook must not create a second
  -- entitlement").
  provider_payment_id text not null unique,
  amount integer not null check (amount > 0),
  status public.payment_status not null default 'pendiente',
  created_at timestamptz not null default now()
);

comment on table public.payments is
  'Payment record backing an entitlement (database.md §9). Created pendiente at checkout '
  'initiation (E5-01); only the Stripe webhook handler (E5-02) may transition status to '
  'exitoso/fallido.';

create table public.entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  familia_id uuid not null references public.profiles(id),
  tier public.entitlement_tier not null default 'contacto_30d',
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payment_id uuid references public.payments(id),
  status public.entitlement_status not null default 'activo'
);

comment on table public.entitlements is
  'A family''s paid contact-unlock window (architecture.md §16): one entitlement type '
  '(contacto_30d, MX$299), account-wide (not per-necesidad), uncapped contact count within '
  'the 30-day window. Created only by the E5-02 webhook on a successful payment -- never by '
  'E5-01''s checkout-session creation itself. Stacks (extends expires_at) rather than '
  'creating an overlapping row on repurchase (architecture.md §16.1).';

-- "Active" is read live as `expires_at > now()` (architecture.md §16, database.md §8) --
-- the fastest, always-correct check for `checkEntitlement`/the checkout-gating logic below.
-- `status` is kept only as a cheap denormalized read for listing history (FAM-13), refreshed
-- lazily rather than by a cron, per architecture.md §4.
create index entitlements_familia_active_idx on public.entitlements (familia_id, expires_at desc);
create index payments_familia_idx on public.payments (familia_id, created_at desc);

alter table public.payments enable row level security;
alter table public.entitlements enable row level security;

create policy payments_select_own_or_admin
  on public.payments
  for select
  to authenticated
  using (auth.uid() = familia_id or public.is_admin());

create policy entitlements_select_own_or_admin
  on public.entitlements
  for select
  to authenticated
  using (auth.uid() = familia_id or public.is_admin());

-- No insert/update/delete policy for `authenticated`/`anon` on either table: every write is
-- system-driven (service-role client, which bypasses RLS entirely) -- see the file header.
