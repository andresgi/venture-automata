# Code Review — E5-02: Stripe webhook handler (entitlement activation)

## Verdict

**PASS**

## Summary of independent verification performed

- Read `engineering/implementation-plan.md` E5-02, `architecture.md` §16.1/§16.2, and
  `database.md` §8/§9 in full.
- Read the full diff surface: `app/api/stripe/webhook/route.ts`,
  `db/migrations/20260904000016_finalize_stripe_payment.sql`,
  `lib/stripe/client.ts` (the `constructStripeWebhookEvent` addition),
  `tests/app/api/stripe-webhook.test.ts`, `scripts/test-e5-02-webhook-finalize.sql`/`.mjs`.
- Cross-read E5-01's already-VERIFIED `actions/entitlements.ts`,
  `db/migrations/20260903000014_entitlements_payments.sql`, and
  `db/migrations/20260904000015_payment_boundary.sql` to confirm this story's finalization
  logic is consistent with how the pending `payments` row is created and constrained.
- Re-ran the full validation suite myself rather than trusting the report:
  - `npm run lint` — clean.
  - `npm run typecheck` — clean (`next typegen && tsc --noEmit`).
  - `npm test` — 315/315 passing, 45 test files.
  - `npm run check:secrets` — OK, no server-only secret exposed client-side.
  - `npm run build` — clean production build; `/api/stripe/webhook` present as a dynamic
    route.
  - `npm run test:db` — ran it **twice consecutively** against the local Supabase/Docker
    stack (already running; no environment contention encountered). Both runs exited 0.
    The only "ERROR" line in the output (`duplicate key value violates unique constraint
    "payments_one_pending_per_familia_idx"`) is the E5-01 probe's own intentional
    concurrency assertion (it expects and catches that error), not a failure — the script's
    exit code and the absence of any `raise exception` from the E5-02 probe's assertion
    blocks confirm all 7 assertions in `test-e5-02-webhook-finalize.sql` passed on both runs.

## Critical Issues

None.

## Important Issues

None. One narrow theoretical edge case was investigated and found to be already
mitigated by an existing constraint (see Security Observations below) — not a defect
requiring a fix.

## Minor Issues

1. **`payment_failed` analytics event omits `amount`** (`finalize_stripe_payment`, line
   68-69) even though `analytics.md` §2's schema for `payment_succeeded`/`payment_failed`
   lists `amount` as a shared property for both. `v_amount` is already fetched in the same
   function and trivially available to include. Cosmetic — does not block PASS, but worth a
   follow-up if the funnel dashboard (E11-02) ever wants a failed-attempt amount breakdown.
2. The webhook route's inline type assertion for the RPC's `.rpc(...).maybeSingle()` return
   shape (`FinalizeStripePaymentRow`, lines 66-72) duplicates the SQL function's `returns
   table` signature by hand with no shared source of truth — if the RPC's column set is ever
   changed, nothing will fail at compile time to catch a mismatch (only `test:db` would
   surface it at runtime). Acceptable for this codebase's existing patterns (E4-03/E4-04 do
   the same), not a new problem introduced by this story.

## Security Observations

- **Signature verification genuinely precedes any DB access.** Confirmed by reading
  `route.ts` top-to-bottom: `request.headers.get("stripe-signature")` → 400 if absent →
  `constructStripeWebhookEvent(rawBody, signature)` inside a `try/catch` → 400 on any thrown
  error → only *after* this does `createServiceRoleClient()` get instantiated and `.rpc(...)`
  get called. The test suite backs this up directly: `rpcMock` is asserted `not
  toHaveBeenCalled()` in all four rejection-path tests (missing header, invalid signature,
  wrong secret, tampered body). This is real signature verification, not client-side/UI-only
  enforcement — the route uses Stripe's own `constructEvent`, and the test file deliberately
  avoids mocking that function, instead using Stripe's own
  `webhooks.generateTestHeaderString` test helper to produce a genuinely valid HMAC
  signature. This is stronger evidence than a fully-mocked unit test would be.
- **Idempotency guard is genuinely atomic — no TOCTOU race.** The state transition and the
  idempotency check are the *same* statement: `update payments set status = p_outcome where
  status = 'pendiente' ... returning ...`. There is no separate `select` to check status
  followed by a later `update` — a redelivered webhook simply matches zero rows in that one
  `UPDATE`, so there is no window between "check" and "act" for a second concurrent
  redelivery to interleave. Verified independently in the DB probe script (`test-e5-02-webhook-finalize.sql`
  step 2: redelivering the same event is asserted to leave the entitlement count and
  `expires_at` unchanged) and by direct reading of the SQL.
- **`FOR UPDATE` correctly prevents the double-extension race for the repurchase-before-expiry case.**
  The `select ... for update` on the family's active entitlement row serializes two
  concurrent successful finalizations for the same family when a prior active entitlement
  already exists — the second transaction blocks until the first commits its `expires_at`
  update, then re-reads the now-updated row. I additionally checked whether the *first-ever
  purchase* case (no existing active entitlement row to lock) could race two concurrent
  successful payments into two duplicate/overlapping entitlement rows for the same family
  (since `for update` on a zero-row result acquires no lock). This theoretical gap is closed
  by a different existing constraint: `payments_one_pending_per_familia_idx`
  (`db/migrations/20260904000015_payment_boundary.sql`), a **partial unique index enforcing
  at most one `pendiente` payment row per family at a time**. Since only one payment can be
  `pendiente` for a given family at any moment (E5-01's `createCheckoutSessionAction` reuses
  the existing pending boundary row rather than creating a second one), two independent
  Stripe webhook deliveries reporting two different successful payments for the same family
  cannot occur concurrently in the first place — the second purchase's `payments` row cannot
  even be created as `pendiente` until the first has already resolved to `exitoso`/`fallido`.
  No entitlement-table-level unique constraint exists to independently enforce "at most one
  active entitlement row per family," but given the payments-side constraint, this is not
  currently exploitable. Flagging this reasoning explicitly for the record rather than
  silently passing over it, since it's a cross-file (migration + action) argument rather
  than something enforced within a single file.
- **`checkout.session.expired` is the correct Stripe event for this purpose.** Verified
  against the installed `stripe` package's type definitions and against Stripe's documented
  behavior: `checkout.session.expired` fires when a Checkout Session's time limit elapses
  without completing (the correct "abandoned checkout" signal for a `mode: "payment"`
  session). `checkout.session.async_payment_failed` (mentioned in the story brief as a
  plausible false candidate) applies only to delayed/async payment methods (e.g. OXXO,
  SPEI-style methods) which this integration does not use (`lib/stripe/client.ts` only ever
  creates a stock `mode: "payment"` session with a synchronous card-style line item, no
  `payment_method_types` configuration implying async methods). There is no
  `checkout.session.failed` event in Stripe's API, confirming the developer's code comment.
  This mapping is correct.
- **Least privilege honored.** `finalize_stripe_payment` is `SECURITY DEFINER`,
  `revoke`s execute from `public`/`anon`/`authenticated`, and `grant`s only to
  `service_role`. Verified this is actually enforced (not just declared) via the DB probe's
  step 7, which explicitly asserts an `authenticated`-role call raises
  `insufficient_privilege`, and confirmed this assertion executes successfully in my own
  `test:db` run.
- **No secrets in source.** `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SIGNING_SECRET` are read only
  from `process.env`; `check:secrets` confirms no server-only secret leaks client-side.
  `.env.example` placeholders are clearly non-functional (`sk_test_...`-shaped dummy values),
  consistent with the project's documented "no real Stripe account yet" posture
  (`agent/DECISIONS.md`).
- **Logging is safe.** Error logs (`console.error`) include only event type, error name/code,
  and Stripe's own `provider_payment_id` (already non-sensitive, provider-assigned session
  IDs) — no payment amounts, no PII, no raw Stripe payloads logged.
- **Analytics event addition is appropriate scope, not creep.** The developer flagged
  `payment_succeeded`/`payment_failed` writes to `analytics_events` as "a judgment call
  beyond the literal acceptance criteria." I checked `engineering/analytics.md` §2 directly:
  both events are explicitly specified there (`payment_initiated` / `payment_succeeded` /
  `payment_failed`, with `entitlement_id`/`payment_id`, `amount` as properties, feeding the
  Free→Paid conversion metric in §7/line 87). `implementation-plan.md`'s E11-01 "Ownership
  note" establishes the precedent that the story which creates the transactional event
  (E4-03 for `candidate_profile_viewed`/`compatible_match_found`) is also responsible for
  writing the durable `analytics_events` row at the same time as the state transition, with
  E11-01 only adding PostHog delivery on top later. Writing these two events inside the same
  atomic `finalize_stripe_payment` transaction that performs the state transition is
  consistent with that established pattern and is the *correct* place to do it (a
  best-effort write from the Next.js route after the RPC returns would risk a payment
  succeeding with no matching analytics event on any partial failure). This is not scope
  creep — it is closing a real analytics-instrumentation gap for two already-specified P0
  events, non-blockingly, and it is not this story's job to invent `payment_initiated`
  (correctly left to whichever of E5-01/E5-03 owns checkout initiation — verified that event
  name does not appear anywhere in the current codebase, so no duplicate/conflicting
  instrumentation was introduced).

## Test Coverage Observations

- `tests/app/api/stripe-webhook.test.ts` (10 tests) is genuinely meaningful, not just
  count-padding: it covers all four signature-rejection paths (missing header, invalid
  signature, wrong secret, tampered body-with-valid-shaped-header), both handled event types
  routed to the correct outcome + RPC args, the ignored-event-type 200 path, the
  already-finalized idempotent-redelivery response shape, the `payment_not_found` → 200
  mapping, and the generic-RPC-error → 500 mapping. Using Stripe's real
  `generateTestHeaderString` instead of mocking `constructEvent` away is a meaningfully
  stronger test than the norm for this kind of handler — it actually exercises the HMAC
  verification path, catching a class of bug (e.g. an accidentally-swapped
  `constructEvent`/`constructEventAsync` call, or a rawBody-vs-parsed-JSON mistake) that a
  fully-mocked test would hide entirely.
- `scripts/test-e5-02-webhook-finalize.sql` (7 numbered assertion blocks) directly satisfies
  both explicit story-required tests: step 2 is the duplicate-webhook-delivery test (asserts
  no second entitlement, no expiry extension, `already_finalized = true`), and step 3 is the
  repurchase-before-expiry stacking test, including the specifically-called-for **negative
  assertion** that the new `expires_at` is *not* ~30 days from `now()` (which would silently
  indicate the buggy "reset from now" behavior instead of the correct "extend from prior
  expiry" behavior) — this is exactly the kind of test that would catch a regression a
  less careful implementation could pass by accident. Steps 1, 4, 5, 6, 7 round out coverage
  of fresh-entitlement creation, `fallido` never touching entitlements, idempotent
  fallido-redelivery, unknown-`provider_payment_id` rejection, and privilege enforcement.
- I independently confirmed both the unit-test suite and the DB probe pass by re-running
  them myself (not just reading the code and trusting the developer's report).
- One coverage gap, non-blocking: there is no test exercising two *genuinely concurrent*
  `finalize_stripe_payment` calls for the same family (e.g. two `psql` sessions racing via
  `pg_sleep` inside the transaction, the way `test-e5-01-payment-boundary.mjs` does for the
  payments-boundary race). The atomicity argument for the `FOR UPDATE` stacking path is
  sound by inspection and is the same pattern already used and tested this way in E5-01, but
  a story this security/financially-sensitive would ideally have had an explicit concurrent-session
  probe for the stacking path too, mirroring E5-01's existing pattern. Suggest as a
  low-priority follow-up, not a blocker — the serialization guarantee of `SELECT ... FOR
  UPDATE` inside a single-statement PL/pgSQL function is well-established Postgres behavior,
  not a novel claim needing proof here to the same degree the payments-boundary race did.

## Acceptance Criteria Assessment

| # | Acceptance Criterion (from `implementation-plan.md` E5-02) | Verdict |
|---|---|---|
| 1 | Webhook signature verified; rejects unsigned/invalid payloads | PASS |
| 2 | Idempotent on `provider_payment_id` — a redelivered webhook does not create a second entitlement or extend expiry twice | PASS |
| 3 | Stacks `expires_at` correctly on repurchase per `architecture.md` §16.1 (extends from current `expires_at`, not `now()`, never creates a duplicate/overlapping row) | PASS |
| 4 | Required: a test simulating a duplicate webhook delivery | PASS (DB probe step 2 + unit test "is idempotent on a redelivered event") |
| 5 | Required: a test simulating repurchase before expiry asserting `expires_at` extends from the *current* expiry, not `now()` | PASS (DB probe step 3, including the explicit negative assertion against a `now()`-based computation) |

All five acceptance criteria are satisfied and independently verified against a live
Postgres instance, not just read from source.

## Required Changes

None required for this story to remain VERIFIED. Optional, non-blocking follow-ups (may be
logged to the backlog at the orchestrator's discretion, not required before merge):

1. Include `amount` in the `payment_failed` analytics event's metadata for parity with
   `payment_succeeded` and with `analytics.md`'s documented shared property list.
2. Consider adding a concurrent-session DB probe for the stacking `FOR UPDATE` path
   (mirroring `test-e5-01-payment-boundary.mjs`'s existing pattern) as defense-in-depth
   documentation of the atomicity guarantee, given this path moves real money/entitlements.
