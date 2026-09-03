# Functional QA

## Follow-up verdict

**PASS_WITH_MINOR_ISSUES**. The two prior functional defects are resolved. All E2-01 acceptance criteria and E1-03 regression checks pass at source/automated-test level. Browser execution was unavailable, so live interaction and viewport evidence remain unconfirmed.

## Environment

- Nanamex web-only app; Next.js 16.3.4, React 19.2, Vitest 4.1.11.
- QA ownership checked: native mobile QA is not applicable; web QA is agent-driven.
- No Chromium/Chrome/Playwright/Puppeteer tooling was available. Source review covered intended 375, 430, 768, and 1440px layouts. Visual-only findings remain tracked separately in `agent/qa/e2-01-visual-qa.md`.
- Reviewed implementation plan, UX/UI specs, constraints, prior QA, and code review.

## Test Cases

### TC-01 — Seven-step flow and Step 1 age-range restriction
- **Scenario:** Inspect Step 1 DOM and wizard step/progress implementation.
- **Expected:** Seven-step flow; Step 1 has only fixed age-range choices and no numeric/date inputs.
- **Actual:** PASS. `rangoEdadValues` is the fixed `0-1`, `1-3`, `3-6`, `6-12`, `12+` set; Step 1 renders no number/date input; `step` is bounded to 1–7 and seven progress segments are present. Existing component test confirms no number/date inputs.
- **Result:** PASS.

### TC-02 — Required Step 1 validation (prior BUG-001)
- **Scenario:** Render a child with an empty age selection and attempt to advance.
- **Expected:** Siguiente is disabled until every child has a selected age range.
- **Actual:** PASS. `canNext` now requires `data.children.length > 0 && data.children.every(Boolean)` (`necesidad-wizard.tsx:24`). The added regression test asserts an empty child keeps Siguiente disabled (`tests/components/familia/necesidad-wizard.test.tsx:18-21`).
- **Result:** PASS; BUG-001 resolved.

### TC-03 — Forward/back/Guardar y salir autosave
- **Scenario:** Exercise save transitions and inspect failure handling.
- **Expected:** Forward, back, and exit autosave; data is retained on failure; navigation happens only after successful save.
- **Actual:** PASS. `next`, `back`, and `exit` persist before changing step/navigating; `afterSave` stops on error and leaves state intact (`necesidad-wizard.tsx:20-23`). Existing autosave tests pass.
- **Result:** PASS.

### TC-04 — Pending-save duplicate submission (prior BUG-002)
- **Scenario:** Inspect controls while a save transition is pending.
- **Expected:** Guardar y salir is disabled during pending save.
- **Actual:** PASS. Button now has `disabled={isPending}` (`necesidad-wizard.tsx:39`), matching Atrás and Siguiente. The primary action also shows the `SpinnerGap` loading indicator. Source-level verification was possible; no browser throttling test was possible.
- **Result:** PASS; BUG-002 resolved.

### TC-05 — Fresh versus resume draft
- **Scenario:** Open FAM-03 without a draft and with a selected draft ID.
- **Expected:** Fresh is empty; resume loads only the selected owned `borrador`.
- **Actual:** PASS. `page.tsx:14-19` conditionally queries only when `draft` is supplied and filters by ID, family owner, and `estado='borrador'`; mapped values initialize the wizard. Both route tests pass.
- **Result:** PASS.

### TC-06 — Multi-day editable time ranges
- **Scenario:** Select multiple days and edit each day’s from/to values; submit invalid ordering through validation.
- **Expected:** Each selected day has an editable range; invalid ranges are rejected server-side.
- **Actual:** PASS at source/schema level. Step 3 maintains one range per selected day, renders editable time inputs, and Zod enforces HH:MM plus start-before-end. Persistence normalizes keys for the DB. Targeted validation tests pass.
- **Result:** PASS.

### TC-07 — Server-side validation and authorization
- **Scenario:** Bypass the client with exact ages/birthdates, malformed steps/IDs, invalid dates/times/payment ranges/zones/children, unauthenticated users, non-family users, foreign drafts, and active drafts.
- **Expected:** Invalid or unauthorized data cannot persist.
- **Actual:** PASS. Strict Zod schemas reject unknown exact-age/birthdate fields and invalid values. The action checks authentication, family role, zone existence, UUID format, ownership, and draft state; restricted RPC repeats ownership/state checks and enum-casts children. DB tests cover privilege restrictions, replacement, authorization rejection, and rollback.
- **Result:** PASS.

### TC-08 — E1-03 regression
- **Scenario:** Run family profile onboarding, zone autocomplete, and family route regression tests.
- **Expected:** E1-03 behavior remains functional.
- **Actual:** PASS. Targeted E2-01/E1-03 tests pass; prior E1-03 QA recorded 9/9 focused tests and source review at 375/430/768/1440px.
- **Result:** PASS.

## Bugs

No open functional bugs. Prior BUG-001 and BUG-002 are resolved and rechecked above.

## Regression Results

- `npm test`: **PASS — 21 files, 139 tests**.
- Targeted E2-01/E1-03 suite: **PASS**.
- `npm run test:db`: **PASS** — local Supabase reset, migration, privilege/RPC, authorization, replacement, and rollback checks.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**; only existing Supabase Node 20 deprecation warnings.

## Recommendation

Accept E2-01 functional behavior as **PASS_WITH_MINOR_ISSUES** pending browser-based confirmation of interactions and responsive rendering. No native-mobile QA is required by the project constraints. The remaining visual/layout findings are tracked by Visual QA, not functional defects.
