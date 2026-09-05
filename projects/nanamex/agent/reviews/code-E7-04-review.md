# Code Review

## Verdict

REVISE

## Critical Issues

None identified.

## Important Issues

- **The required populated recent-opportunity preview is still not implemented.** `EmptyOpportunities` is rendered unconditionally and there is no query, card rendering, or `Ver todas` link for NIN-04. The new `/ninera/oportunidades` route is a truthful E7-05 placeholder, but that does not satisfy E7-04's approved acceptance criterion for a recent-opportunity preview. Either implement the NIN-04 preview/path in this story or record an explicit scope exception and do not mark E7-04 accepted.

## Minor Issues

- The verification banner container remains neutral (`border-border bg-bg-raised`) for all three states; the badge semantics are correct, but the persistent banner does not use the state-specific trust treatment required by the UI spec.
- The NIN-03 empty opportunity treatment is a large bordered card, whereas the screen spec calls for a compact message/action beneath completion. This is visual/spec drift, not a data or security failure.
- The mobile navigation uses intrinsic-width horizontal links in `justify-around`; long labels such as “Oportunidades” and “Identificación” have a source-level narrow-screen overflow/squeezing risk. Browser measurement was unavailable.

## Security Observations

- **PASS:** The page obtains the authenticated user server-side and redirects unauthenticated requests before dashboard reads.
- **PASS:** `getNineraOnboardingState` derives authorization from the server-side `profiles` row and requires both `role = ninera` and `account_status = activa`; the page handles `readError`, rejects unauthorized/inactive accounts before dashboard queries, and redirects incomplete onboarding before those queries.
- **PASS:** Dashboard reads use the server-only service-role client and constrain every query to `user.id`; no service-role credential or raw sensitive data is sent to the client.
- **PASS:** All four dashboard query errors are checked, and missing required `profiles`/`perfil_ninera` rows throw into the route error boundary rather than becoming default trust/completion values. The onboarding helper also fails closed on read errors.
- **PASS:** No PII logging, client-side authorization-only enforcement, unsafe input handling, or new secret exposure was introduced. The existing middleware remains defense in depth; page-level authorization is now present as required.

## Test Coverage Observations

- Focused tests pass: `tests/app/ninera.test.tsx` and `tests/components/shared/trust-badge.test.tsx` — 22 tests.
- The revised tests cover inactive/non-niñera denial, dashboard read errors, missing required profile rows, incomplete onboarding redirect, verification states, an incomplete completion calculation, the placeholder route, loading, and retryable error UI.
- The authorization test does not assert that dashboard query mocks were not called before redirect, and completion coverage does not exercise all six-field combinations or the 0%/100% boundaries.
- There is still no test for a populated opportunity preview or NIN-04 “Ver todas” route because neither is implemented. Browser-level responsive and network transition verification was unavailable.

## Acceptance Criteria Assessment

- PASS — Incomplete niñera onboarding redirects to `/ninera/perfil` before dashboard reads.
- PASS — Dashboard shows verification status at banner scale with correct pending 24–48h expectation copy; TrustBadge state/icon/label/color semantics remain intact.
- PASS — Profile completion is calculated from the six required categories and displays progress plus a completion CTA when incomplete; identity verification remains optional/non-blocking.
- FAIL — Recent opportunity preview: no opportunity data/cards or NIN-04 “Ver todas” path is rendered; the empty state is unconditional.
- PASS — An “Explorar vacantes” entry exists and resolves to `/ninera/oportunidades`.
- PASS — Dashboard and onboarding reads fail closed on query errors/missing required rows rather than rendering false defaults.
- PASS — Active niñera authorization is enforced at the page boundary, including account status, before dashboard data reads.
- PASS — Loading and retryable error states are present.
- PASS — The opportunities placeholder is truthful and does not imply E7-05 matching, listings, interest, paywall, or payment functionality.
- PASS — Existing TrustBadge compact/detail/large callers retain their prior state semantics; focused TrustBadge regression tests pass.
- PASS — Current rendered navigation links resolve to existing routes; no dead opportunity link was introduced.
- UNCERTAIN — Responsive behavior: source-level layout is present, but mobile overflow/banner wrapping was not browser-verified.

## Required Changes

1. Resolve the remaining E7-04 scope gap: implement the recent-opportunity preview and NIN-04 “Ver todas” path, or record an explicit approved scope exception and keep E7-04 from being declared accepted.
2. Add a regression assertion that unauthorized/inactive redirects occur before dashboard reads, and expand completion boundary/combinations if the six-field calculation is relied upon for release.
3. Before release, address or explicitly waive the banner token treatment, compact empty-state composition, and mobile navigation width risk; perform browser-level responsive verification when tooling is available.
