# Functional QA

## Verdict

**PASS** — revised NIN-03 behavior closes the prior functional findings. Dashboard reads now fail closed, loading/error states exist, active niñera authorization and onboarding redirects are enforced before dashboard reads, and the truthful `/ninera/oportunidades` placeholder route is linked without pretending that E7-05 is implemented.

## Environment

- Repository: `projects/nanamex`
- Test date: 2026-09-04
- Next.js 16.3.4, React 19.2.8, TypeScript, Vitest 4.1.11, local Supabase/Postgres
- Web-only V1; `config/CONSTRAINTS.md` says web QA is agent-driven and native mobile QA is not applicable
- No production code modified by QA; only this QA report was updated
- Browser click-through/pixel tooling was unavailable, so functional evidence is focused Vitest, route/build evidence, source inspection, and live database regression checks

## Test Cases

### TC-001 — Unauthenticated access

- **Scenario:** Invoke the NIN-03 server page without an authenticated Supabase user.
- **Expected:** Redirect to `/login` before dashboard reads.
- **Actual:** `app/ninera/page.tsx` redirects immediately when `user` is absent.
- **Result:** PASS

### TC-002 — Active-niñera authorization

- **Scenario:** Request `/ninera` as a non-niñera or account not in active status.
- **Expected:** Deny/redirect before dashboard data reads; do not render niñera data.
- **Actual:** `getNineraOnboardingState` derives `isNinera` from `role = ninera` **and** `account_status = activa`; the page redirects to `/login` when false. Focused test verifies the denial occurs before reads.
- **Result:** PASS

### TC-003 — Incomplete onboarding redirect

- **Scenario:** Authenticated active niñera has no complete profile.
- **Expected:** Redirect to `/ninera/perfil` before dashboard reads.
- **Actual:** The page checks `isOnboarded` before creating/fetching dashboard data and redirects to `/ninera/perfil`.
- **Result:** PASS

### TC-004 — Fail-closed dashboard reads and recoverable error state

- **Scenario:** Profile, niñera profile, zones, or age-experience read returns an error; also test a missing required profile row.
- **Expected:** Never render default/empty trust or completion data as if the read succeeded; surface a retryable error state.
- **Actual:** The page checks all four query errors and throws an explicit error; missing `profiles` or `perfil_ninera` data also throws. `app/ninera/error.tsx` renders “No pudimos cargar tu panel” and “Intentar de nuevo”. Focused tests cover both error and missing-row paths.
- **Result:** PASS

### TC-005 — Verification states and pending SLA copy

- **Scenario:** Render `no_verificada`, `en_proceso`, and `verificada` dashboard states.
- **Expected:** Honest state labels/actions; pending state includes non-promissory 24–48 hour expectation; identity verification remains optional.
- **Actual:** Focused tests pass for all three states. `TrustBadge` renders the state-specific semantics; pending copy says “Normalmente toma 24–48 horas”; upload/state action is absent for verified profiles and available for the other states.
- **Result:** PASS

### TC-006 — Completion percentage and CTA

- **Scenario:** Render partial and complete profile data.
- **Expected:** Progress reflects the six completion categories, stays within 0–100, and incomplete profiles have a completion CTA to NIN-07.
- **Actual:** Focused test confirms one completed category renders 17% and `/ninera/perfil`; the implementation counts zones, availability, modalities, salary pair, description, and age experience and computes 100% when all are present.
- **Result:** PASS

### TC-007 — Empty state and recovery action

- **Scenario:** Onboarded niñera has no pushed opportunities.
- **Expected:** Explicit calm empty state with actionable profile completion and/or truthful exploration recovery path.
- **Actual:** The dashboard renders the icon container, headline, explanatory copy, `Completar perfil` when incomplete, and `Explorar vacantes` linked to `/ninera/oportunidades`. Focused test verifies the heading and recovery link.
- **Result:** PASS

### TC-008 — Loading state

- **Scenario:** Dashboard reads are slow.
- **Expected:** Dashboard-shaped loading feedback rather than a blank/stalled surface.
- **Actual:** `app/ninera/loading.tsx` exists, uses `aria-busy="true"`, labels the surface “Cargando tu panel”, and includes dashboard-shaped skeleton blocks. Focused test verifies the loading surface.
- **Result:** PASS

### TC-009 — Explorar vacantes route is truthful; E7-05 remains unimplemented

- **Scenario:** Follow the NIN-03 exploration link and inspect the built route and UI.
- **Expected:** Route exists and does not claim to provide opportunity data or introduce a paywall while E7-05 is not implemented.
- **Actual:** Build includes dynamic `/ninera/oportunidades`. The page honestly renders “Las vacantes abiertas aparecerán aquí” and “Todavía no hay oportunidades para explorar”; it has no fake listings, filters, interest action, lock, checkout, or payment UI. No NIN-04 pushed-opportunities implementation or E7-05 matching/filtering/interest behavior was found; backlog still lists E7-05 as a separate eligible story.
- **Result:** PASS — truthful placeholder; E7-05 functionality remains out of scope/unimplemented

### TC-010 — Regression of existing niñera flows

- **Scenario:** Run focused NIN-03 tests and the project validation suite, including database probes.
- **Expected:** Existing onboarding, profile edit, identity verification, authorization, and database behavior remain green.
- **Actual:** All checks passed as listed below.
- **Result:** PASS

## Bugs

None found in the revised E7-04 scope.

## Regression Results

- `npm test -- --run tests/app/ninera.test.tsx --no-file-parallelism`: **PASS — 1 file, 12 tests**
- `npm test -- --run --no-file-parallelism`: **PASS — 67 files, 481 tests**
- `npm run lint`: **PASS**
- `npm run typecheck`: **PASS**
- `npm run check:secrets`: **PASS**
- `npm run build`: **PASS**; route list includes `/ninera`, `/ninera/oportunidades`, `/ninera/perfil`, and `/ninera/perfil/identificacion`; only existing Supabase Node 20 deprecation warnings appeared
- `npm run test:db`: **PASS** — local reset and all existing E0–E7-03 probes completed successfully, including E7-01 onboarding, E7-02 profile-edit, and E7-03 identity/concurrency coverage

## Recommendation

Mark E7-04 **VERIFIED**. Keep E7-05 separate and unimplemented; when it is built, replace the truthful `/ninera/oportunidades` placeholder and add NIN-04 pushed-opportunity data/preview plus end-to-end interest-flow coverage. Browser-level authenticated testing remains desirable when tooling is available, but no functional blocker was found in this rerun.
