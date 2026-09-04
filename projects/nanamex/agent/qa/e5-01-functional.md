# Functional QA

## Verdict

PASS

E5-01 checkout initiation passes the specified server-side gates, matching authorization, durable payment boundary, Stripe request construction, retry/recovery, and concurrency checks. No production code was modified. This does not verify live Stripe credentials, live hosted Checkout, or E5-02 webhook fulfillment.

## Environment

- Repository: `projects/nanamex`
- Platform: web-only Next.js 16.3.4 / TypeScript / Node test tooling
- Test date: 2026-09-04
- Stripe calls: mocked in action and Stripe-wrapper tests; no real Stripe credentials/network session available
- Database: local Supabase/Postgres reset and probes
- QA ownership: web QA is agent-driven; native mobile QA is not applicable
- Reviewed: E5-01 implementation plan, PRD §7, PRD addendum payment spike, architecture §16/§16.4, database payment/entitlement schema, security payment controls, current action/Stripe/ContactButton code, latest code review, and focused/regression tests

## Test Cases

### TC-001 — Unauthenticated and account gate
- **Scenario:** Invoke the server action with a valid pair while unauthenticated; repeat as a non-familia, inactive family, and family with missing profile.
- **Expected:** Reject before payment persistence or Stripe.
- **Actual:** Session-derived user is required; role must be `familia` and `account_status` must be `activa`; failures return generic error.
- **Result:** PASS (automated action coverage and source inspection)

### TC-002 — Verification gate
- **Scenario:** Authenticated active family with email or phone verification false.
- **Expected:** Block server-side even if the route/action is reached directly; no Stripe/payment mutation.
- **Actual:** Both flags are re-read from `profiles`; either false returns `blocked_unverified` and payment work is not reached.
- **Result:** PASS (automated action test)

### TC-003 — Active entitlement and entitlement DB failure
- **Scenario:** Active entitlement exists; then entitlement lookup returns a database error.
- **Expected:** Active entitlement bypasses checkout; lookup failure fails closed rather than charging.
- **Actual:** Future `expires_at` returns `already_entitled`; query error returns generic error; Stripe is not called in either gate path.
- **Result:** PASS (automated action tests)

### TC-004 — Unauthorized necesidad/candidate and all eligibility predicates
- **Scenario:** Try another family’s necesidad or an invalid/missing candidate. Exercise candidate role, active account, published, complete profile, same zone, accepted modalidad, availability coverage, salary overlap, child-age overlap, and minimum experience (`>= 2`) one predicate at a time.
- **Expected:** Any failed ownership/eligibility predicate prevents checkout and Stripe invocation.
- **Actual:** Necesidad query requires caller ownership and `estado = activa`. Candidate query requires `publicado`, `perfil_completo`, matching zone, matching modalidad, and active profile; role is checked as `ninera`. `scoreMatch` then requires every factor to be true, including requested schedule coverage, range overlap, age intersection, and experience threshold. Invalid/missing rows fail closed.
- **Result:** PASS (focused tests cover unauthorized, inactive account, role, availability, salary, age, and experience; source/schema inspection additionally confirms published, complete, zone, modalidad, ownership, and active-necesidad predicates)

### TC-005 — Input and APP_URL validation
- **Scenario:** Malformed UUIDs; unsafe configured APP_URL containing path/query; safe configured HTTPS origin; development fallback.
- **Expected:** Invalid input/origin is rejected before auth/payment mutation; safe origin is used and request headers cannot control redirects.
- **Actual:** Zod rejects malformed UUIDs before auth. `applicationOrigin()` rejects non-local non-HTTPS origins and URL credentials/query/hash; configured origin is used, with localhost development fallback. APP_URL validation occurs before payment-boundary read/insert.
- **Result:** PASS (automated action tests and source inspection)

### TC-006 — Happy-path payment boundary and Stripe payload
- **Scenario:** Fully eligible, verified family with no active entitlement initiates Contactar through `ContactButton`.
- **Expected:** Durable pending payment exists before provider call; one MX$299 Checkout Session is created with safe return/cancel URLs, required metadata, and idempotency key; linked URL is returned and ContactButton redirects.
- **Actual:** Action inserts `pendiente`, calls Stripe with 29,900 MXN cents, metadata (`payment_boundary_id`, `familia_id`, `entitlement_tier`), configured-origin URLs, and the durable idempotency key, then links provider ID/URL/expiry. `ContactButton` redirects on `checkout_created` and displays visible error/success toast otherwise.
- **Result:** PASS (action, Stripe-wrapper, and component tests)

### TC-007 — Stripe failure and missing URL
- **Scenario:** Stripe create rejects; wrapper receives a created session without a redirect URL.
- **Expected:** Return generic error, do not claim checkout success; no entitlement is activated.
- **Actual:** Action catches provider errors and returns generic error. Wrapper throws when Stripe returns no URL. E5-01 contains no entitlement write.
- **Result:** PASS (automated Stripe/action coverage and source inspection)

### TC-008 — Payment boundary insert/link/recovery
- **Scenario:** Insert boundary, successful link; link error; zero-row link; successful compensation; compensation failure; final recovery write failure; retry using the original idempotency boundary.
- **Expected:** Never return an unverified URL; compensate when possible; preserve discoverability and avoid rotating idempotency when provider state is uncertain; retry safely.
- **Actual:** Link is guarded by pending-row update. Failed/zero-row link re-reads before compensation. Successful expiration marks the row expired and rotates the key; failed expiration preserves provider ID/URL as `unknown`. Final persistence failure fails closed; retry recreates idempotently and re-reads Stripe before linking/returning.
- **Result:** PASS (focused action tests; latest code review confirms the recovery path)

### TC-009 — Existing session, expiry, and retry
- **Scenario:** Pending open session; expired session; complete session; provider session with missing expiry; retry session with future expiry.
- **Expected:** Reuse only provider-confirmed open and future-expiring sessions; never return expired, complete, or expiry-less URL.
- **Actual:** Existing linked session is retrieved and only `open` + present future expiry is reused. Expired/expiry-less sessions are not returned and trigger a new attempt; complete returns pending error. Retry with existing boundary re-reads provider and requires the same open/future-expiry conditions.
- **Result:** PASS for covered open/expired/missing-expiry paths. The focused suite does not directly assert complete/missing-expiry responses during the post-create recovery branch; implementation fails closed by inspection (non-blocking coverage gap also noted by Code Review).

### TC-010 — Duplicate submission and concurrency
- **Scenario:** Repeat initiation for one family and invoke two callers concurrently.
- **Expected:** One pending boundary and at most one provider call; duplicate caller receives a safe pending/error response or reuses the valid session.
- **Actual:** Partial unique index enforces one pending row per family; claim lease permits one provider call; Stripe idempotency key is durable. Local DB race probe reports the expected duplicate-key rejection and completes successfully.
- **Result:** PASS (action concurrency test and live local DB probe)

### TC-011 — Deferred E5-02/E5-03 scope
- **Scenario:** Inspect behavior after checkout creation and UI surface.
- **Expected:** E5-01 must not activate entitlement or implement full FAM-08/FAM-09 paywall/webhook fulfillment.
- **Actual:** No entitlement write or webhook handler was added. ContactButton intentionally redirects directly to Stripe; full paywall/checkout screens and webhook activation remain E5-03/E5-02.
- **Result:** PASS (scope verification; deferred work not a failure for E5-01)

## Bugs

None found.

## Regression Results

- `npm test -- --run --no-file-parallelism`: **PASS — 43 files, 300 tests**
- `npm run lint`: **PASS**
- `npm run typecheck`: **PASS**
- `npm run check:secrets`: **PASS — no server-only secret exposed client-side**
- `npm run build`: **PASS**; only existing Supabase Node 20 deprecation warnings
- `npm run test:db`: **PASS**; local migration reset and necesidad, profile-view, favorites, payment-boundary probes completed. The duplicate payment insert emitted the expected unique-index error as part of the race assertion.

## Recommendation

Accept E5-01 as functionally verified for its implemented scope. Keep the non-blocking recovery-test gap (complete/missing-expiry provider states in the post-create recovery branch) as follow-up. Before release, perform a human-authorized Stripe test-mode smoke test with real credentials and separately verify E5-02 webhook reconciliation and E5-03 paywall/checkout UI.
