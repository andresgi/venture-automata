# Code Review

## Verdict

PASS_WITH_MINOR_ISSUES

The effective E5-04 implementation, including the prop and closed-necesidad fixes, passes the required automated validation and satisfies the security and lifecycle requirements reviewed here. Do not mark VERIFIED or merge from this review alone.

## Critical Issues

None found.

## Important Issues

None found after the fixes.

## Minor Issues

- The concurrent database probe launches two sessions concurrently but has no deterministic barrier or induced delay at the row lock, so it demonstrates the observed result without guaranteeing lock-boundary overlap on every run.
- There is no single end-to-end automated test covering Stripe success return, delayed webhook finalization, and eventual FAM-10 rendering together; the return-state tests and live contact probe cover the seams independently.
- The E5-04 commits are cleanly scoped, but the reviewed prop/closed-necesidad fixes and the focused migration test are currently working-tree changes rather than part of commits `5f37c3e`/`8b576bb`. They must be included in the isolated E5-04 change set, while the unrelated workspace changes remain excluded.

## Security Observations

- **PASS:** The contact route requires an authenticated, onboarded familia with verified email and phone before resource reads.
- **PASS:** New-contact access is server-enforced: the action derives the family from the session, and the service-role-only RPC repeats family role/status, ownership, active-necesidad, current candidate eligibility, and active `contacto_30d` entitlement checks.
- **PASS:** Existing durable contacts are checked before entitlement, candidate discoverability/depublication, account status, pipeline lifecycle, and active-necesidad gates. Both `cerrada_contratada` and `cerrada_cancelada` preserve established-contact access; closed necesidades cannot create a new contact.
- **PASS:** Phone PII is queried and returned only for an established durable contact or the successful atomic contact result. The pre-contact form receives no phone.
- **PASS:** Contact creation, `nueva -> contactada`, and `candidate_contacted` analytics insertion occur in one transaction. The locked pipeline row and durable one-to-one contact relation make retries idempotent and prevent duplicate analytics.
- **PASS:** Stale checkout-return handling uses the query parameter only as navigation input. Recent boundaries remain pending; stale provider-backed boundaries are reconciled with Stripe; only confirmed-expired or never-created boundaries are cleared, with no entitlement granted by cleanup. Provider errors fail closed.
- **PASS:** No new secret exposure, raw payment/provider identifiers in the UI, or inappropriate PII logging was found. Notification delivery is explicitly deferred to E10 without changing contact success semantics.

## Test Coverage Observations

- Focused and full unit/component suite: **388 tests passed** across 56 files.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run check:secrets`: passed.
- `npm run build`: passed; only the existing Supabase Node 20 deprecation warning remains.
- `npm run test:db`: passed against the local database, including the E5-04 probe. The probe covers authorization, entitlement expiry, rollback, idempotency, concurrency outcome, pipeline lifecycle, depublication/deactivation, both closed-necesidad states, and stale/ineligible new-contact attempts.
- Route regression tests cover both closed states for established access and active-only new-contact routing. The migration structural test is focused but should remain in the committed E5-04 set.

## Acceptance Criteria Assessment

- **Stale-payment pending return is server-backed and does not become unpaid:** PASS. Recent returns remain pending; stale cleanup consults Stripe when needed, clears only safe terminal boundaries, and grants no entitlement.
- **FAM-10 route/action/RPC authentication and authorization:** PASS. Route gates the session and family eligibility; action uses session-derived identity; RPC is service-role-only and repeats authorization.
- **Active-only new contact authorization:** PASS. Both route and RPC require an active necesidad when no durable contact exists.
- **Established-contact access after both closed necesidad states:** PASS. `cerrada_contratada` and `cerrada_cancelada` are covered in route tests and the live SQL probe.
- **Entitlement semantics:** PASS. New contact requires an unexpired account-wide `contacto_30d`; established retries bypass entitlement checks.
- **Permanent contact access across pipeline lifecycle and candidate depublication/deactivation:** PASS. Existing-contact branch precedes those gates and is covered by the probe/tests.
- **Atomic and idempotent contact transaction:** PASS. Contact row, pipeline transition, and analytics event are transactional; retries return the existing contact without a second event.
- **PII boundary:** PASS. Candidate phone is withheld before contact and returned only after established/successful contact authorization.
- **Tests/probe:** PASS_WITH_MINOR_ISSUES. Meaningful focused and live coverage passes; concurrency overlap is not deterministic and the full Stripe-to-contact journey is not exercised as one test.
- **Notification behavior and E6 deferrals:** PASS_WITH_SCOPE_EXCEPTION. Durable contact/event handoff is implemented; Epic 10 delivery and E6 pipeline UI remain explicitly deferred and are not silently faked.
- **Strict commit scope:** PASS_WITH_MINOR_ISSUES. The two E5-04 commits contain only E5-04 implementation, tests/probe, relevant documentation, and the intertwined candidate-detail integration. Ensure the current fixes/test are committed with E5-04 and keep unrelated `test-invoice-generator` and `.claude/settings.json` changes out.

## Required Changes

1. Before merge, commit the reviewed prop fixes, closed-necesidad route/RPC changes, regression probe assertions, and migration test as part of the isolated E5-04 change set; exclude unrelated workspace changes.
2. Keep E5-04 unverified until the independent Functional/Visual QA pass completes. A deterministic lock-contention probe and a combined Stripe-return/webhook/contact test are recommended follow-ups, not merge blockers for this review.
