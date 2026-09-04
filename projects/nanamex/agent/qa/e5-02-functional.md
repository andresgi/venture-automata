# Functional QA

## Verdict

PASS_WITH_MINOR_ISSUES (route-path minor issue fixed directly post-review — see
"Post-Review Fix" note at end of this file)

E5-02's Stripe webhook handler correctly verifies signatures before any DB access, is
atomically idempotent on `provider_payment_id`, and stacks `expires_at` from the current
expiry (not `now()`) on repurchase, exactly as `architecture.md` §16.1 and `database.md` §9
specify. All automated and live-DB checks pass on independent re-execution. One
documentation/implementation inconsistency (webhook route path) is flagged as a minor,
non-blocking issue for the record — it does not affect current test coverage or the
implemented behavior, but would cause a real production failure if a human configures
Stripe's dashboard webhook URL against the path documented in `architecture.md`/
`security.md` instead of the path actually implemented.

## Environment

- Repository: `projects/nanamex`
- Platform: web-only Next.js 16.3.4 / TypeScript / Vitest / Node test tooling
- Test date: 2026-09-04
- Stripe calls: real `stripe.webhooks.constructEvent`/`generateTestHeaderString` exercised
  in unit tests (not mocked); Checkout Session creation itself is never invoked by this
  route so no live Stripe network dependency exists for this story
- Database: local Supabase/Postgres (Docker, `supabase_db_nanamex`, already running) — full
  `supabase db reset --local` + probe scripts run twice independently
- QA ownership: per `config/CONSTRAINTS.md` "QA Ownership", mobile QA is not applicable (web
  only); web QA is agent-driven. This story is backend-only (no UI), so Visual QA does not
  apply — confirmed with the orchestrator's framing and by inspection (no `design/UI-SPEC.md`
  entry maps to a webhook route).
- Reviewed: `engineering/implementation-plan.md` E5-02, `architecture.md` §16.1/§16.2/§16.4,
  `database.md` §8/§9, `security.md` (webhook signature requirement), `agent/reviews/
  code-E5-02-review.md`, `app/api/stripe/webhook/route.ts`, `db/migrations/
  20260904000016_finalize_stripe_payment.sql`, `lib/stripe/client.ts`, `tests/app/api/
  stripe-webhook.test.ts`, `scripts/test-e5-02-webhook-finalize.sql`/`.mjs`, and E5-01's
  `actions/entitlements.ts` / payment-boundary migrations for upstream consistency.

## Test Cases

### TC-001 — Signature verification rejects before DB access
- **Scenario:** POST with no `stripe-signature` header; with a syntactically-shaped but
  invalid signature; with a signature computed against the wrong webhook secret; with a
  validly-signed body that is then tampered with after signing.
- **Expected:** All four rejected with 400, and the Supabase RPC (`finalize_stripe_payment`)
  is never invoked.
- **Actual:** Confirmed by direct code reading (`route.ts` checks the header, then calls
  `constructStripeWebhookEvent` inside a `try/catch` and returns 400 on any thrown error,
  before `createServiceRoleClient()` is even constructed) and by independently re-running
  the four corresponding unit tests, which assert `rpcMock` was `not.toHaveBeenCalled()` in
  each case. The test suite uses Stripe's own `generateTestHeaderString` test helper rather
  than mocking `constructEvent` away, so this genuinely exercises the HMAC verification path.
- **Result:** PASS

### TC-002 — Idempotency on redelivered successful event (live DB)
- **Scenario:** Finalize a `pendiente` payment as `exitoso` (creates entitlement), then
  redeliver the identical event a second time via a second `finalize_stripe_payment` call
  with the same `provider_payment_id`.
- **Expected:** Second call reports `already_finalized = true`, does not create a second
  entitlement row, and does not change `expires_at`.
- **Actual:** `scripts/test-e5-02-webhook-finalize.sql` step 2 asserts entitlement count
  stays at 1 and `expires_at` is byte-for-byte unchanged before/after the redelivery. Ran
  `npm run test:db` (full `supabase db reset --local` + all probe scripts) twice
  independently — both runs exited 0 with no assertion failures.
- **Result:** PASS

### TC-003 — Repurchase-before-expiry stacking extends from current expiry, not now()
- **Scenario:** With an active entitlement already present (from TC-002's setup), finalize a
  second, distinct `pendiente` payment as `exitoso`.
- **Expected:** No second/overlapping entitlement row created; the existing row's
  `expires_at` becomes `prior_expires_at + 30 days`, and is explicitly *not* `now() + 30
  days`.
- **Actual:** `test-e5-02-webhook-finalize.sql` step 3 asserts both the positive condition
  (`expires_at` within 5s of `prior_expiry + 30 days`) and the specifically-required
  negative condition (`expires_at` is *not* within 5s of `now() + 30 days`) — this negative
  assertion is exactly what would catch a "silently reset from now()" regression. Verified
  passing on both independent `test:db` runs. Also confirmed by direct reading of the SQL
  function: it does a `select ... for update` on the currently-active entitlement row and
  computes `v_new_expires_at := v_active_expires_at + interval '30 days'` only in the
  stacking branch — the fresh-entitlement branch (`now() + interval '30 days'`) is only
  reachable when no active row exists.
- **Result:** PASS

### TC-004 — Failed payment (`checkout.session.expired`) never touches entitlements
- **Scenario:** Finalize a `pendiente` payment as `fallido`; redeliver the same fallido
  event a second time.
- **Expected:** Payment marked `fallido`; entitlement count unchanged in both cases; second
  delivery reports `already_finalized = true`.
- **Actual:** `test-e5-02-webhook-finalize.sql` steps 4–5 assert exactly this, both passing
  on independent re-run.
- **Result:** PASS

### TC-005 — Unknown `provider_payment_id` and authorization boundary
- **Scenario:** Call `finalize_stripe_payment` with a `provider_payment_id` that was never
  created by this environment's checkout flow; call the function directly as the
  `authenticated` role instead of `service_role`.
- **Expected:** Unknown ID raises (`payment_not_found`), route maps this to a 200
  acknowledgment (stop Stripe retry storm) with a warning logged, not a 500; direct
  `authenticated`-role calls are rejected with `insufficient_privilege` (function is
  `SECURITY DEFINER`, revoked from `public`/`anon`/`authenticated`, granted only to
  `service_role`).
- **Actual:** Confirmed via `test-e5-02-webhook-finalize.sql` steps 6–7 (both pass) and via
  the unit test `"acknowledges (200) a payment_not_found RPC error instead of causing a
  retry storm"`. Directly verified `route.ts`'s `error.message?.includes("payment_not_found")`
  branch returns `{received: true, warning: "payment_not_found"}` with status 200 (not 500),
  and a generic RPC error (e.g. transient DB failure) instead correctly returns 500 so
  Stripe retries — verified via the `"returns 500 (retryable) on an unexpected RPC error"`
  unit test.
- **Result:** PASS

### TC-006 — Event-type handling and correct HTTP status codes back to Stripe
- **Scenario:** `checkout.session.completed` → should map to `exitoso`; `checkout.session.
  expired` → should map to `fallido`; an irrelevant event type (e.g. `payment_intent.
  created`) → should be acknowledged without calling the RPC.
- **Expected:** Correct outcome mapping for the two handled types; 200 (not an error status)
  for unhandled types, since a non-2xx would cause Stripe to retry an event this endpoint
  will never care about.
- **Actual:** Confirmed by direct code reading and the three corresponding unit tests, all
  passing. Cross-checked Stripe's own documented event catalog and the installed `stripe`
  package's type definitions: `checkout.session.async_payment_failed` (a plausible
  false-candidate mentioned in the story brief) only applies to async payment methods (OXXO/
  SPEI-style) which this integration's `mode: "payment"` session (`lib/stripe/client.ts`)
  does not use; there is no `checkout.session.failed` event in Stripe's API. The
  `checkout.session.expired` → `fallido` mapping is the correct "abandoned checkout" signal
  for this integration.
- **Result:** PASS

### TC-007 — Upstream consistency with E5-01's payment boundary and entitlement read
- **Scenario:** Confirm the `pendiente` row this webhook finalizes is the same row E5-01
  creates/links, and that E5-01's `checkEntitlement` (in `actions/entitlements.ts`) reads
  entitlements the same way E5-02 writes them.
- **Expected:** No schema/semantic mismatch between the two stories' handling of `payments`/
  `entitlements`.
- **Actual:** `finalize_stripe_payment` transitions `payments.status` from `pendiente` via a
  match on `provider_payment_id`, which is populated by E5-01's checkout-session creation/
  link-back step. `actions/entitlements.ts`'s `checkEntitlement` reads
  `entitlements.expires_at > now()` ordered by `expires_at desc` — exactly the same
  predicate E5-02's function uses internally (`e.expires_at > now()` in the stacking-lookup
  query) to decide whether to stack or create fresh. No downstream story (E5-04, not yet
  built) is blocked or contradicted by this story's writes.
- **Result:** PASS

### TC-008 — Route path vs. architecture/security documentation (discrepancy check)
- **Scenario:** Compare the implemented route path against what `architecture.md` and
  `security.md` document as the webhook endpoint.
- **Expected:** Consistent path, since a human will eventually configure Stripe's dashboard
  webhook URL from this documentation.
- **Actual:** Implemented at `app/api/stripe/webhook/route.ts` → `POST /api/stripe/webhook`.
  `architecture.md` lines 93 and 498, and `security.md` line 96, all instead document
  `POST /api/webhooks/stripe`. This is a real path mismatch between the implementation and
  its own architecture/security documentation — not currently exercised by any test (all
  test requests target `/api/stripe/webhook` to match the actual file location, which is
  circular and doesn't catch the doc mismatch). It has no functional test impact today
  (`agent/DECISIONS.md` records no real Stripe account/webhook exists yet), but if a human
  later configures Stripe's dashboard against the documented `/api/webhooks/stripe` path
  without noticing the discrepancy, every webhook delivery would 404 and no payment would
  ever finalize.
- **Result:** FAIL (see BUG-001) — documentation/implementation inconsistency, not a runtime
  logic defect. Downgrades verdict to PASS_WITH_MINOR_ISSUES rather than blocking PASS.

## Bugs

### BUG-001 — Webhook route path does not match architecture.md/security.md
- **Severity:** Minor (documentation/operational risk, not a logic defect)
- **Reproduction:** Compare `app/api/stripe/webhook/route.ts` (implemented path
  `/api/stripe/webhook`) against `engineering/architecture.md:93`, `architecture.md:498`,
  and `engineering/security.md:96`, all of which specify `/api/webhooks/stripe`.
- **Expected:** Implementation path matches the documented integration path so a human
  configuring Stripe's dashboard webhook URL from `architecture.md`/`security.md` reaches
  the actual handler.
- **Actual:** The two paths differ (`/api/stripe/webhook` vs `/api/webhooks/stripe`); no
  redirect or alias exists between them.
- **Affected requirement:** `implementation-plan.md` E5-02 doesn't itself specify a literal
  URL, but `architecture.md` §"API routes" (line 498) and `security.md`'s webhook-signature
  requirement (line 96) do, and this story's implementation silently diverges from both.
  Not a blocker for this story's own automated acceptance criteria (signature verification/
  idempotency/stacking, all of which pass regardless of the URL segment), but should be
  reconciled — either update the two docs to `/api/stripe/webhook`, or move the route —
  before a human wires up a real Stripe webhook endpoint against this documentation.

## Regression Results

- `npm run lint` — PASS, clean
- `npm run typecheck` (`next typegen && tsc --noEmit`) — PASS, clean
- `npx vitest run tests/app/api/stripe-webhook.test.ts` — PASS, 10/10 tests
- `npm test -- --run --no-file-parallelism` — PASS, 45 files / 315 tests
- `npm run check:secrets` — PASS, no server-only secret exposed client-side
- `npm run build` — PASS, clean production build; `/api/stripe/webhook` listed as a dynamic
  route
- `npm run test:db` (full `supabase db reset --local` + all probe scripts, including
  `test-e5-02-webhook-finalize.mjs`) — PASS, run **twice independently**, both exited 0. The
  only "ERROR" line in either run's output (`duplicate key value violates unique constraint
  "payments_one_pending_per_familia_idx"`) belongs to E5-01's own intentional concurrency
  probe, not E5-02's assertions.

## Recommendation

Accept E5-02 as functionally verified for signature verification, idempotency, and
repurchase-stacking — all three literal acceptance criteria and their required tests pass
under independent re-execution against a live Postgres instance, matching Code Review's
findings but confirmed here from a fresh, non-trusting pass rather than accepted on faith.
File BUG-001 (route path vs. `architecture.md`/`security.md` mismatch) to the backlog as a
non-blocking documentation/config-reconciliation follow-up, to be resolved before a human
connects a real Stripe webhook to this endpoint. Recommend marking E5-02 VERIFIED with
BUG-001 tracked separately rather than gating VERIFIED on it, since it does not affect any
of this story's tested runtime behavior.

## Post-Review Fix (orchestrator, 2026-09-04)

BUG-001 was fixed directly rather than deferred: the route was moved from
`app/api/stripe/webhook/route.ts` to `app/api/webhooks/stripe/route.ts` to match the
path already documented in `architecture.md` (lines 93, 498) and `security.md` (line 96)
— two docs agreeing against one deviating implementation made the docs the source of
truth. `tests/app/api/stripe-webhook.test.ts` and the doc-comment in `lib/stripe/client.ts`
were updated to match. Re-ran `npm run lint`, `npm run typecheck`, `npm test -- --run
--no-file-parallelism` (315/315 passing), `npm run check:secrets`, and `npm run build`
(clean, `/api/webhooks/stripe` now listed as the dynamic route) — all pass. No remaining
open issues for E5-02.
