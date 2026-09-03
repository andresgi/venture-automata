# Functional QA

## Verdict

**FAIL**

The corrected implementation satisfies the populated, loading, retry-error, matching-score/checklist, live TrustBadge, summary, eligibility-filter, and missing-live-row safety behaviors reviewed here. However, the required empty-state recovery action is still not implemented as specified: it links to `/familia` with “Volver a mis necesidades” instead of linking to the FAM-03 review/edit flow with “Editar necesidad”.

## Environment

- Nanamex web-only Next.js app; Next.js 16.3.4, React 19.2.8, Vitest 4.1.11.
- QA ownership checked in `config/CONSTRAINTS.md`: web QA is agent-driven; mobile QA is not applicable.
- Validation performed in the supplied working tree. No production code was modified.
- Focused FAM-04 tests: **7 files, 27 tests passed**.
- Full suite: **31 files, 225 tests passed**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**; only the existing Supabase Node 20 deprecation warning was emitted.
- Browser/viewport visual validation was not performed; this report covers functional component/server-render output and source-level data-flow verification.

## Test Cases

### TC-01 — Default populated state
- **Scenario:** Render FAM-04 with active necesidad, two pipeline matches, and live candidate rows.
- **Expected:** Ranked candidate cards render with candidate identity/avatar, score, checklist, and TrustBadge.
- **Actual:** PASS. Cards render and are sorted by score descending; live names, initials/photo branch, and actions are present.
- **Result:** PASS.

### TC-02 — Empty state
- **Scenario:** Render an active necesidad with zero pipeline rows.
- **Expected:** Calm empty state, explicit no-match copy, guidance naming likely fields, and primary “Editar necesidad” action to FAM-03 review.
- **Actual:** No-match headline and guidance render, but the CTA is “Volver a mis necesidades” and points to `/familia`.
- **Result:** FAIL. See BUG-001.

### TC-03 — Loading state
- **Scenario:** Render the route-specific FAM-04 loading boundary.
- **Expected:** Skeleton cards while data loads, including candidate-card geometry and no blank content.
- **Actual:** `aria-busy` region labeled “Cargando candidatas” renders six skeleton cards with avatar, text bars, score, and three checklist placeholders.
- **Result:** PASS.

### TC-04 — Retry error state and retry action
- **Scenario:** Simulate necesidad read failure and live candidate read failure.
- **Expected:** Inline retry banner rather than redirect or blank page; retry re-runs the server data fetch.
- **Actual:** Both failures render the expected alert and “Reintentar” button. The button calls `router.refresh()`.
- **Result:** PASS.

### TC-05 — Match Score and checklist behavior
- **Scenario:** Render scores and snapshots containing multiple passing factors.
- **Expected:** Score numeral is shown; checklist labels are translated and capped at three lines; low scores remain normally visible.
- **Actual:** Score renders as a percentage, labels are Spanish, factor ordering is deterministic, cap is three, and low scores are not hidden/demoted.
- **Result:** PASS.

### TC-06 — TrustBadge current status
- **Scenario:** Render candidates with each live verification status and exercise badge interaction.
- **Expected:** `no_verificada`, `en_proceso`, and `verificada` use their specified labels/treatments, with stable geometry and explanatory tooltip; status is current, not frozen in the pipeline snapshot.
- **Actual:** All three variants and tooltip interactions pass component tests. FAM-04 queries live `verification_status` separately and passes it to `TrustBadge`; status is not included in sorting.
- **Result:** PASS.

### TC-07 — Necesidad summary
- **Scenario:** Render an active necesidad with zona, modalidad, schedule, and payment range.
- **Expected:** One-line summary and expandable detail.
- **Actual:** Native `<details>` summary renders zone, modality, ordered days, and expanded payment/schedule details; the `Filtrar` entry point is present but correctly disabled because E4-02 is not built.
- **Result:** PASS.

### TC-08 — Current candidate eligibility
- **Scenario:** Review the live candidate query used for pipeline IDs.
- **Expected:** Only currently discoverable candidates are listed: published, complete, and owned by an active profile.
- **Actual:** Query applies `publicado = true`, `perfil_completo = true`, and inner-related `profiles.account_status = activa`. Missing live rows are omitted; partial omission still leaves valid cards rendered.
- **Result:** PASS by implementation verification. Existing focused mocks do not independently assert the query predicates against real seeded eligible/ineligible rows; this remains a test-coverage gap, not an observed behavior failure.

### TC-09 — Missing live data must not produce a blank grid
- **Scenario:** Pipeline contains IDs but the live candidate query returns no matching rows.
- **Expected:** Documented empty or error/retry state, never an empty card grid.
- **Actual:** When all live rows are absent, the page sets `liveStatusError` and renders the retry banner. When only some rows are absent, valid rows render and absent rows are omitted.
- **Result:** PASS.

## Bugs

### BUG-001

- **Severity:** Medium
- **Reproduction:**
  1. Open FAM-04 for an active necesidad with zero matches.
  2. Observe the empty-state primary action.
  3. Follow the action.
- **Expected:** Per `design/UX-spec.md` FAM-04 lines 247–251 and `design/UI-SPEC.md` lines 162–165, show “Editar necesidad” and route to the FAM-03 review/edit step so the family can broaden the likely blocking field.
- **Actual:** `EmptyState` renders “Volver a mis necesidades” and links to `/familia` (`app/familia/necesidad/[id]/page.tsx:143–158`). This does not provide the specified recovery path.
- **Affected requirement:** E4-01 acceptance criterion “all four states per UI-SPEC.md FAM-04”; FAM-04 empty-state recovery requirement.

## Regression Results

- Focused FAM-04/component tests: **PASS — 27/27**.
- Full test suite: **PASS — 225/225**.
- Lint: **PASS**.
- Typecheck: **PASS**.
- Production build: **PASS** with pre-existing Supabase Node 20 deprecation warning only.

## Recommendation

**Do not mark E4-01 VERIFIED yet.** Implement or obtain an explicitly approved exception for the FAM-03 edit/review recovery action, then add a regression assertion for its label and destination. Re-run focused and full tests afterward. The other reviewed FAM-04 paths are ready and no blank-grid behavior was observed.
