# Code Review

## Verdict

PASS_WITH_MINOR_ISSUES

The pending-return fix closes the prior correctness gap: a `checkout=success` return with no
committed entitlement is now reconciled against the authenticated family's server-side
payment boundary and held in a pending screen instead of being redirected into the unpaid
paywall. The implementation is not ready to mark VERIFIED or merge because the working tree
still is not a strict E5-04 change set.

## Critical Issues

None found.

## Important Issues

1. **Strict diff isolation remains unresolved.** The current tree still includes sibling E5-01,
   E5-03, and E5-05 work, broad onboarding/navigation changes, QA artifacts, root workspace
   changes, and unrelated `projects/test-invoice-generator` deletions. This prevents safe
   attribution and merge of E5-04, even though the E5-04 behavior is reviewable. Isolate the
   story and repeat review/validation on that change set.

2. **Return reconciliation can remain pending for stale abandoned payments.**
   `getCheckoutReturnStateAction` treats any latest family payment in `pendiente` or
   `exitoso` as `pending` when no active entitlement exists. This is fail-closed for access,
   but an old abandoned `pendiente` row can cause a manually revisited or crafted
   `checkout=success` URL to show a pending confirmation indefinitely until the URL is
   cleared. The current E5-01 lifecycle should eventually classify/expire abandoned payment
   boundaries, or the return state should correlate the return to a provider/session boundary
   (without trusting the query parameter) and distinguish failed/expired payments from a
   genuinely finalizing success.

## Minor Issues

- Retry is user-driven through `Actualizar`; there is no timed polling. This is acceptable
  for the current MVP handoff, but the copy should remain clear that the user must retry.
- There is no end-to-end test spanning Stripe success return, webhook delay, entitlement
  visibility, and FAM-10 rendering. The tests cover the route and client/server seams
  independently.
- The concurrent database probe has no deterministic synchronization barrier, so it is not a
  guaranteed contention proof, although the transaction design and runtime probe remain sound.

## Security Observations

- **PASS:** `checkout=success` is only a navigation hint. The route and return action do not
  grant access from the query parameter; they require an entitlement or a server-side payment
  boundary, and contact confirmation still re-checks the entitlement in the SECURITY DEFINER
  transaction.
- **PASS:** Return state is scoped to the authenticated session-derived family ID. No family
  ID, payment ID, or phone is accepted from query parameters.
- **PASS:** FAM-10 direct access for a normal non-entitled new contact redirects to the FAM-08
  marker. A successful-return-with-pending-payment is the deliberate exception and renders
  only the pending state.
- **PASS:** Candidate phone is selected only for an established owned `contacto` relation or
  returned by a successful/idempotent `confirm_contact` result. A missing phone remains a
  valid established-contact state and does not fall back to the new-contact form.
- **PASS:** The RPC independently enforces active familia, verified email and phone, active
  owned necesidad, `nueva` pipeline state for new contacts, current candidate eligibility,
  and unexpired `contacto_30d` entitlement. It is callable only by `service_role` and uses a
  pair row lock.
- **PASS:** Contact insertion, pipeline transition, and `candidate_contacted` analytics are
  one transaction; established-contact retries are idempotent and preserve the original
  message/event.
- **PASS:** No Resend/Twilio notification call or notification-dependent success path was
  introduced. E10 owns non-blocking delivery from this durable handoff.
- No secrets or inappropriate PII logging were found in the reviewed paths.

## Test Coverage Observations

I ran the focused E5-04 suites: **24 tests passed across 3 files**, plus `npm run lint` and
`npm run typecheck`. The route tests cover pending success return, normal non-entitled direct
access, established lifecycle states, candidate unavailability, null-phone disclosure, and
pre-contact phone absence. The banner tests cover server-backed ready/pending retry and query
stripping. Existing functional QA reports the full suite, build, secret scan, database probe,
and live atomic/idempotency checks passing.

Missing coverage includes a real delayed-webhook integration/E2E flow, expired/failed/stale
payment-return behavior, and deterministic concurrent contention.

## Acceptance Criteria Assessment

- **Checkout success auto-navigates to the specific candidate FAM-10 route:** PASS when the
  entitlement is durable; PASS_WITH_MINOR_ISSUE for the absence of automatic polling while
  finalization is pending. The pending state no longer routes to the unpaid flow.
- **A temporarily unfinalized successful payment is not treated as unpaid:** PASS. The route
  uses authenticated server-backed payment/entitlement state and renders `PendingPaymentPage`
  rather than the FAM-08 marker.
- **Pending state/retry is server-backed and does not trust query parameters:** PASS. The
  query only selects the return UI; the action queries the session-derived family payment
  and entitlement rows. Retry calls that action again.
- **Normal non-entitled direct access routes through the paywall:** PASS. Without
  `checkout=success`, missing entitlement redirects to the candidate FAM-06 route with the
  `contactar=1` marker.
- **Authenticated active familia with verified email and phone:** PASS in the route gates and
  independently in `confirm_contact`; return reconciliation itself is session-scoped.
- **Owned active necesidad:** PASS in the route and RPC authorization checks.
- **New contact requires current candidate eligibility and `pipeline.estado = nueva`:** PASS.
- **New contact requires active `contacto_30d` entitlement:** PASS, enforced transactionally
  at the RPC boundary.
- **Established contact survives entitlement expiry and pipeline progression:** PASS for
  `contactada`, `entrevista`, `contratada`, and `descartada`.
- **Established contact survives candidate depublication/deactivation:** PASS; durable
  contact is checked before discoverability gates.
- **Phone disclosed only after successful/established contact, including null phone:** PASS.
- **Optional message validation (maximum 1000 characters):** PASS.
- **Atomic contacto + pipeline transition + `candidate_contacted`:** PASS.
- **Idempotent duplicate/retry behavior:** PASS; contention evidence has the minor test-quality
  limitation noted above.
- **No manual `nueva` -> `contactada` bypass:** PASS; E5-04 is the only exposed transition
  path reviewed here.
- **Notification behavior / E6 scope is explicit:** PASS. Notification delivery is explicitly
  deferred to Epic 10 as a non-blocking consumer of the durable contact handoff, and FAM-11
  pipeline UI is explicitly E6 scope. The interim FAM-10 forward CTA is documented rather
  than inventing an E6 route.
- **Strict E5-04 diff isolation:** FAIL pending isolation; unrelated files remain in the
  working tree.

## Required Changes

1. Isolate the strict E5-04 diff from sibling-story, workspace, and unrelated project changes;
   then rerun independent review and validation on that isolated set.
2. Add lifecycle/correlation handling for stale abandoned payment boundaries, or document and
   test the accepted behavior so an old pending payment cannot indefinitely misrepresent a
   later return as still finalizing.
3. Do not mark E5-04 VERIFIED or merge until the isolated change set passes review. Preserve
   the explicit E10 notification and E6 FAM-11 handoffs.
