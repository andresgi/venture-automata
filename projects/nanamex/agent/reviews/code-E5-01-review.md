# Code Review

## Verdict

REVISE

The latest ContactButton and Toast fixes resolve the two prior visual findings: the pending state now has a stable spinner, disabled/aria-busy state, and live status; mobile feedback is positioned above the sticky action bar while desktop remains bottom-left. Focused UI tests, lint, and typecheck pass. However, the current button still redirects directly to Stripe rather than entering the approved FAM-08 → FAM-09 flow, and the current test suite does not assert the required post-create rejected-provider recovery variants.

## Critical Issues

None.

## Important Issues

1. **Approved checkout boundary is bypassed in the UI.** `ContactButton` sends `checkout_created` directly to `window.location.href = result.checkoutUrl`. The E5-01 acceptance criterion in `engineering/implementation-plan.md` requires `Contactar`/`Solicitar entrevista` to route to FAM-08 → FAM-09, and the UX/UI specs define FAM-08 as the contact gate. Directly opening hosted Stripe is an intentional temporary shortcut, but it is still a scope/acceptance mismatch and makes the E5-03 flow impossible to introduce without changing this behavior. Either route to the approved flow or record an explicit accepted exception before treating E5-01 as complete.

2. The post-create recovery tests still do not directly assert expired, complete, or missing-expiry provider responses. The implementation appears fail-closed by inspection, but these are payment-boundary safety cases and should be regression-tested.

## Minor Issues

1. The short claim lease has no owner token. A slow provider call can be overtaken after 120 seconds; Stripe idempotency and re-read logic reduce duplicate risk, but strict lease ownership is not guaranteed.
2. `already_entitled` currently produces a success toast rather than continuing to the specified post-unlock contact flow. This may belong to E5-04, but the handoff contract should be explicit rather than leaving Contactar as a terminal toast.

## Security Observations

- Session-derived identity and server-side role, account, verification, entitlement, and pair eligibility checks remain intact.
- Stripe remains server-only; APP_URL is configured and validated rather than derived from request headers.
- No entitlement activation occurs here, and checkout URLs are not treated as payment proof.
- Payment-boundary metadata/idempotency and the local unique pending boundary support E5-02 reconciliation and reduce retry/concurrency risk.

## Test Coverage Observations

Focused UI tests pass: 2 files, 4 tests. `npm run lint` and `npm run typecheck` pass. The ContactButton tests cover pending spinner/accessibility and mobile-vs-desktop toast classes, but do not cover error-toast positioning, duplicate clicks beyond the disabled assertion, or the redirect path. Existing functional QA reports the broader suites and payment-boundary probe passing; the recovery-variant gap remains.

## Acceptance Criteria Assessment

- **PASS** — Contact invokes the server action with session-derived family identity and server-side family/account enforcement.
- **PASS** — Email and phone verification are read server-side and either false blocks the action.
- **PASS** — Active entitlement short-circuits checkout; entitlement lookup errors fail closed.
- **PASS** — Pair authorization enforces ownership and the required candidate/need eligibility predicates.
- **PASS** — Stripe creates one MXN item for MX$299 with required metadata, configured return URLs, and durable idempotency.
- **PASS** — Durable payment boundary, linking, compensation, retry, lease contention, open-session reuse, and expiry safety are implemented; no unverified/expired URL is returned by inspection.
- **PASS** — APP_URL is validated before payment-boundary mutation.
- **UNCERTAIN** — E5-02 signed webhook/reconciliation is outside E5-01; metadata prepares recovery but webhook behavior is not verified here.
- **FAIL** — ContactButton redirects directly to the Stripe URL instead of routing through the approved FAM-08 → FAM-09 checkout flow.
- **PASS** — No entitlement activation or webhook fulfillment was added, and no full FAM-08/FAM-09 implementation was added; however, the direct redirect is an additional interim UI behavior that conflicts with the specified boundary.

## Required Changes

- Resolve or explicitly approve the FAM-08 → FAM-09 routing exception; do not silently retain the direct Stripe redirect.
- Add regression assertions for complete, expired, and missing-expiry provider responses in the post-create recovery branch.

---

# Round 2

## Verdict

PASS_WITH_MINOR_ISSUES

Both Round 1 Required Changes are genuinely resolved. The FAM-08 → FAM-09 routing exception is now explicitly, substantively recorded (not just asserted) in `agent/BACKLOG.md`'s E5-01 entry, citing the human approval date and the specific Round 1 Important Issue it resolves, and committing E5-03 to replace the interim wiring. Three new regression tests in `tests/actions/entitlements.test.ts` correctly exercise the post-create existing-boundary-retry branch (`actions/entitlements.ts` lines 189-203) for `complete`, `expired`, and missing-`expiresAt` provider responses, and each asserts fail-closed behavior (`status: "error"`, no `checkoutUrl` property). Full validation suite passes, including a live `test:db` run (no contention hit this round). One documentation-process gap is noted below but is not blocking given the explicit written record already in BACKLOG.md.

## Required Change #1 verification — routing exception

`agent/BACKLOG.md`'s E5-01 entry (lines ~587-600) contains a dedicated "Documented exception (Code Review Important Issue #1, human-approved 2026-09-04)" block that:

- Names the exact behavior (`window.location.href = result.checkoutUrl` on `checkout_created`).
- Names the acceptance criteria it deviates from (`implementation-plan.md`'s E5-01 criteria, `design/UI-SPEC.md`'s FAM-08).
- States the reason (FAM-08/FAM-09 screens are E5-03's scope and don't exist yet) and draws the explicit parallel to the E1-02 scope-narrowing precedent already accepted in this project.
- States what still fails closed regardless (verified/blocked/already-entitled states still surface via toast, not a silent success).
- Commits E5-03 to replacing the interim wiring, and states this entry is "the explicit record that the interim behavior was seen and accepted, not missed."

`components/familia/contact-button.tsx`'s doc comment (lines 18-27) matches this account and doesn't overstate scope.

**Gap:** AGENTS.md's Execution Rules require recording important decisions in `agent/DECISIONS.md`, and this project's own established pattern for exceptions/scope narrowing (E1-02, E4-01's empty-state CTA acceptance) is to log a dated `## YYYY-MM-DD — ...` entry in DECISIONS.md, not only in BACKLOG.md prose. I found no corresponding DECISIONS.md entry for this human approval — `grep` for "FAM-08", "FAM-09", "routing exception", and "2026-09-04" plus a scan of all `## ` headings in DECISIONS.md through the E5-01 Stripe-credentials entry turned up nothing recording this specific approval. The BACKLOG.md text is detailed and credible enough that I accept it as satisfying "resolve or explicitly approve" for this review's purposes — the substance of the approval is genuinely present, not fabricated after the fact — but the missing DECISIONS.md entry is an inconsistency with this repo's own convention and should be added for a clean audit trail. Downgraded from an Important Issue to a Minor Issue below since it's a paper-trail completeness gap, not a substantive unresolved risk.

## Required Change #2 verification — recovery-variant tests

`tests/actions/entitlements.test.ts` lines 115-136 add three new tests, each targeting the `existingBoundary` re-verification branch in `actions/entitlements.ts` (lines 189-203):

- `"fails closed when Stripe reports the post-create session already complete (existing-boundary retry)"` — `getStripeSession` resolves `{ state: "complete", ... }`; asserts `result.status === "error"` and `result` lacks `checkoutUrl`.
- `"fails closed when Stripe reports the post-create session already expired (existing-boundary retry)"` — `{ state: "expired", expiresAt: <past> }`; same assertions.
- `"fails closed when Stripe omits expiry on the post-create session (existing-boundary retry)"` — `{ state: "open", expiresAt: null }`; same assertions.

All three correctly set up an existing pending `payments` row (`existingBoundary = true` at runtime) with `checkout_url: null, provider_payment_id: null`, which is the precondition for entering the branch under test (verified by reading `actions/entitlements.ts` directly, not just trusting the test). These are meaningful regression tests, not tautological ones — reverting the `if (remote.state !== "open" || !remote.expiresAt || ...)` guard would fail all three.

## Critical Issues

None.

## Important Issues

None remaining from Round 1.

## Minor Issues

1. (Carried from Round 1, unresolved, still non-blocking for E5-01's actual scope.) The short claim lease (`checkout_claimed_at`) has no owner token — any caller within the 120-second window can pass the `.or(checkout_claimed_at.is.null,...)` predicate once it expires, without proving it holds the original claim. Stripe's own idempotency key and the post-create re-verification added for Required Change #2 substantially reduce the practical risk, and the "allows only one caller through the checkout lease" test still passes. Acceptable to leave for E5-01; revisit if E5-02/E5-03 introduce higher-concurrency retry paths.
2. (Carried from Round 1, unresolved, still non-blocking.) `already_entitled` still produces a terminal success toast (`contact-button.tsx` lines 42-44) rather than continuing into a further contact flow. Consistent with the same FAM-08/FAM-09-doesn't-exist-yet scope boundary as the documented routing exception; should be revisited alongside E5-03/E5-04 rather than blocking E5-01.
3. (New, process-only.) The human approval for the routing exception is recorded in `agent/BACKLOG.md` but not mirrored as a dated entry in `agent/DECISIONS.md`, breaking from this repo's own pattern (see Required Change #1 verification above). Recommend adding a short DECISIONS.md entry for audit-trail consistency; not blocking this review's verdict.

## Security Observations

- Unchanged from Round 1: session-derived identity, server-side role/account/verification/entitlement/pair-eligibility checks remain intact; Stripe stays server-only; APP_URL is validated, not derived from request headers; no entitlement activation happens in this story; checkout URLs are never treated as payment proof.
- The newly-tested fail-closed paths close a real gap: without them, a regression in the `existingBoundary` guard could have silently returned/linked a `complete` or `expired` Stripe session's URL to the user, which is exactly the kind of payment-boundary defect that should be regression-tested rather than left to code-reading alone.

## Test Coverage Observations

- `npm test -- --run --no-file-parallelism`: 44 files, 305 tests, all pass.
- `npm run lint`: pass (no output/errors).
- `npm run typecheck`: pass.
- `npm run check:secrets`: pass ("no server-only secret exposed client-side").
- `npm run build`: pass (Next.js production build completes, all routes compile).
- `npm run test:db`: pass (exit code 0). This run hit no contention; the visible `ERROR: duplicate key value violates unique constraint "payments_one_pending_per_familia_idx"` in the log output is expected/intentional test output from the concurrency probe verifying the partial unique index rejects a second concurrent pending payment for the same familia — not a failure.
- `tests/components/familia/contact-button.test.tsx` still does not assert the `checkout_created` → `window.location.href` redirect path or error-toast positioning (noted in Round 1's Test Coverage Observations); unchanged this round. Non-blocking given the documented interim nature of the redirect, but worth picking up whenever E5-03 replaces this wiring anyway (the test will need rewriting at that point regardless).

## Acceptance Criteria Assessment

- **PASS** — Contact invokes the server action with session-derived family identity and server-side family/account enforcement.
- **PASS** — Email and phone verification are read server-side and either false blocks the action.
- **PASS** — Active entitlement short-circuits checkout; entitlement lookup errors fail closed.
- **PASS** — Pair authorization enforces ownership and the required candidate/need eligibility predicates.
- **PASS** — Stripe creates one MXN item for MX$299 with required metadata, configured return URLs, and durable idempotency.
- **PASS** — Durable payment boundary, linking, compensation, retry, lease contention, open-session reuse, and expiry safety are implemented, and the previously-uncovered post-create rejected-provider paths (`complete`, `expired`, missing `expiresAt`) are now directly regression-tested and confirmed fail-closed.
- **PASS** — APP_URL is validated before payment-boundary mutation.
- **UNCERTAIN** — E5-02 signed webhook/reconciliation is outside E5-01; metadata prepares recovery but webhook behavior is not verified here (unchanged from Round 1 — correctly out of scope).
- **PASS (with documented, human-approved, time-boxed exception)** — ContactButton redirects directly to Stripe's hosted URL rather than routing through FAM-08 → FAM-09, but this is now explicitly recorded as an accepted interim exception in `agent/BACKLOG.md` (human-approved 2026-09-04), with E5-03 committed to replacing it. Treating this as PASS for E5-01's purposes because the exception is genuine, dated, reasoned, and tied to a concrete follow-up story — not because the underlying acceptance criterion was actually met as originally written.
- **PASS** — No entitlement activation or webhook fulfillment was added, and no full FAM-08/FAM-09 implementation was added; the direct redirect is the same documented interim behavior addressed above, not an undisclosed scope change.

## Required Changes

None. Recommended (non-blocking) follow-up: add a dated `agent/DECISIONS.md` entry mirroring the routing-exception approval already recorded in `agent/BACKLOG.md`, for consistency with this project's own audit-trail convention.
