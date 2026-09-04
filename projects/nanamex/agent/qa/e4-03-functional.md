# Functional QA

## Verdict

FAIL

## Environment

- Repository: `projects/nanamex`
- Next.js 16.3.4, TypeScript, local Supabase
- Web QA is agent-driven; no native mobile QA applies (web-only constraint).
- Validation date: 2026-09-03

## Test Cases

### TC-001 — Family access and active necesidad ownership
- **Scenario:** Inspect FAM-06 route and its server-side data queries for unauthenticated users, another family’s necesidad, and non-active necesidades.
- **Expected:** Require authentication; only the owning family may open an active necesidad.
- **Actual:** No user redirects to `/login`. The necesidad query uses `familia_id = user.id` and `estado = activa`; failure redirects to the necesidad route. The write RPC repeats the ownership/active-state check.
- **Result:** PASS

### TC-002 — Current candidate eligibility
- **Scenario:** Open a candidate that is unpublished, incomplete, deactivated, or has an inactive account.
- **Expected:** Do not render the profile or record a view.
- **Actual:** The candidate query requires `publicado = true`, `perfil_completo = true`, and `profiles.account_status = activa`; the RPC independently repeats these checks.
- **Result:** PASS

### TC-003 — Candidate detail data and state rendering
- **Scenario:** Inspect/render the eligible FAM-06 page with and without a photo/references.
- **Expected:** Render photo/name/TrustBadge, full match score/checklist, experience, availability, modalities, salary, description, and a clearly separate self-reported references section; follow the responsive FAM-06 layout and states.
- **Actual:** The page renders the required factual sections and unavailable state, and uses the live verification status. However, the mobile implementation does not implement the specified full-bleed photo header with name and badge overlaid on a scrim; name/badge are below the image. The references section omits the mandatory copy “Proporcionadas por la niñera — Clin no las ha verificado.”, does not render the optional contact note, and does not implement the specified heading icon/hairline row treatment.
- **Result:** FAIL (BUG-001)

### TC-004 — Pipeline auto-creation and frozen snapshot
- **Scenario:** First open of an eligible candidate, followed by repeated opens and changes to live candidate data.
- **Expected:** Create one `nueva` pipeline row if absent; freeze score/checklist at first creation; never overwrite it.
- **Actual:** The RPC inserts `nueva` with the supplied score/checklist and `ON CONFLICT (necesidad_id, ninera_id) DO NOTHING`; the page reads the saved snapshot on subsequent opens. The database has the required unique pair constraint.
- **Result:** PASS by code inspection. No dedicated runtime E4-03 integration test exists.

### TC-005 — Analytics repeated views and sub-60 scores
- **Scenario:** View the same pair repeatedly at a score >=60; view a pair at a score below 60.
- **Expected:** `candidate_profile_viewed` on every view; `compatible_match_found` exactly once per pair only at score >=60; no compatible event below 60.
- **Actual:** The RPC inserts `candidate_profile_viewed` unconditionally. It conditionally inserts `compatible_match_found` at `>= 60`, protected by a partial unique index and matching `ON CONFLICT DO NOTHING`.
- **Result:** PASS by code inspection. The supplied test only asserts SQL text and does not execute repeated/sub-60 cases.

### TC-006 — E5 scope leakage
- **Scenario:** Inspect FAM-06 for contact/payment functionality.
- **Expected:** Do not implement E5 checkout, entitlement, contact creation, or contact analytics in E4-03.
- **Actual:** Contact and favorite controls are visibly disabled with “próximamente”; no payment, entitlement, `contacto`, or `candidate_contacted` behavior is present.
- **Result:** PASS

## Bugs

### BUG-001
- **Severity:** Medium
- **Reproduction:**
  1. Authenticate as a family with an active necesidad.
  2. Open `/familia/necesidad/{necesidadId}/candidatas/{nineraId}` at a mobile viewport, and inspect a profile with references.
  3. Compare the output with `design/UI-SPEC.md` FAM-06 and `design/UI-SYSTEM.md` §4.2.
- **Expected:** Mobile photo/name/badge overlay layout; references permanently disclose that they are unverified and show optional contact notes using the prescribed plain-row treatment.
- **Actual:** Name and badge are rendered below the image (no overlay/scrim). References only show name and relationship/period; the required unverified disclosure, contact note, heading icon, and row dividers are absent.
- **Affected requirement:** FAM-06 candidate detail rendering in UX-spec.md §FAM-06; UI-SPEC.md FAM-06; UI-SYSTEM.md §4.2.

## Regression Results

- `npm test -- --run --no-file-parallelism`: **232/232 tests passed** (33 files).
- `npm run lint`: **passed**.
- `npm run typecheck`: **passed**.
- `npm run check:secrets`: **passed**.
- `npm run build`: **passed**; only the existing Supabase Node 20 deprecation warning was emitted.
- `npm run test:db`: **passed** after local Supabase reset; migrations through `20260903000012` applied and existing RPC checks completed. This suite does not exercise E4-03 behavior.

## Recommendation

Do not mark E4-03 VERIFIED. Fix BUG-001 and add executable database/integration coverage for ownership/eligibility, frozen snapshots, repeated views, and the exact 60 threshold. Re-run functional and visual QA after the fix.

---

# Round 2 (post-fix re-verification)

## Verdict

PASS

## Environment

- Repository: `projects/nanamex`
- Next.js 16.3.4, TypeScript, local Supabase (Docker available this session)
- Web QA is agent-driven; no native mobile QA applies (web-only constraint per config/CONSTRAINTS.md).
- Validation date: 2026-09-03
- Re-read before testing: round-1 `agent/qa/e4-03-functional.md`, `agent/qa/e4-03-visual.md`, `agent/reviews/code-E4-03-review.md`, current source of `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`, `loading.tsx`, `components/familia/reference-list.tsx`, `components/familia/candidate-detail-actions.tsx`, `scripts/test-e4-03-profile-view.{sql,mjs}`.

## Test Cases

### TC-003 (re-verify) — Candidate detail data and state rendering, mobile overlay and references
- **Scenario:** Re-inspect the FAM-06 detail page source for the mobile photo/identity treatment and the references section, against `design/UI-SPEC.md` FAM-06 and `design/UI-SYSTEM.md` §4.2.
- **Expected:** Mobile hero is full-bleed with name/TrustBadge overlaid on a scrim; references section shows the permanent "Proporcionadas por la niñera — Clin no las ha verificado." disclosure, the optional contact note when present, and the heading-icon/hairline-row treatment.
- **Actual:**
  - `page.tsx` now renders `<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 lg:hidden">` containing `<h1>{nombre}</h1>` and the detail `TrustBadge`, overlaid on the photo/initial-placeholder block, with the equivalent non-overlaid block correctly hidden below `lg`. This matches the required mobile overlay-on-scrim composition; the bug reproduction from round 1 (name/badge rendered below the image) no longer reproduces.
  - `components/familia/reference-list.tsx` now renders a `ChatCircleText` heading icon, the exact mandatory disclosure copy verbatim ("Proporcionadas por la niñera — Clin no las ha verificado."), a `divide-y divide-border border-y border-border` row list, and conditionally renders `Contacto: {reference.contacto}` only when a contact note is supplied. `tests/components/familia/reference-list.test.tsx` (3/3) exercises the empty-state disclosure, the optional contact note appearing only when supplied, and the corrected `mt-3`/`space-7` spacing math.
  - `loading.tsx` mirrors the same overlay structure with skeleton placeholders (`candidate-detail-identity-overlay-skeleton`), keeping loading and loaded compositions consistent.
- **Result:** PASS — BUG-001 is resolved for both the mobile overlay and the references disclosure/contact-note/heading treatment.

### TC-004 (re-verify) — Pipeline auto-creation and frozen snapshot, real runtime execution
- **Scenario:** Run `npm run test:db` against local Supabase/Postgres (Docker) and confirm the E4-03 probe (`scripts/test-e4-03-profile-view.sql` + `.mjs`) executes real RPC calls rather than static text assertions.
- **Expected:** First view creates exactly one `pipeline` row in `nueva` with the supplied score/checklist; a later view at a different score does not change the stored snapshot.
- **Actual:** Ran `npm run test:db` to completion (see Regression Results). The SQL probe calls `public.record_candidate_profile_view(...)` twice against the same necesidad/niñera pair with different scores (80 then 59) via live `psql`/`docker exec` execution (not mocked), then asserts inside a `DO $$ ... raise exception ...` block that `match_score_snapshot` is still `80` (the first-write value) and that exactly one `pipeline` row exists for that necesidad. The script exits non-zero if any `raise exception` fires; this run exited 0 with no exception output, so the frozen-snapshot/non-overwrite behavior is runtime-confirmed against real PostgreSQL, not just inferred from source.
- **Result:** PASS by runtime execution (upgraded from round 1's "PASS by code inspection only").

### TC-005 (re-verify) — Analytics repeated views, exact-60 threshold, and concurrency, real runtime execution
- **Scenario:** Run the same probe's remaining assertions: repeated `candidate_profile_viewed` events, `compatible_match_found` exactly once at score >= 60 (including the exact boundary of 60), no compatible event below 60, and idempotency under concurrent views of the same pair.
- **Actual:** The SQL probe (necesidad `...401`) asserts, after two RPC calls at scores 80 then 59 on the same pair, `candidate_profile_viewed` count = 2 and `compatible_match_found` count = 1. A second necesidad (`...402`) asserts a call at score 59 produces zero `compatible_match_found` rows, then a call at exactly 60 produces exactly one `compatible_match_found` row while the pipeline snapshot remains frozen at 59 (the first-ever write for that pair). The companion `test-e4-03-profile-view.mjs` fires two concurrent RPC calls (`Promise.all`) against a third necesidad/pair at score 75 and asserts exactly one `pipeline` row, two `candidate_profile_viewed` events, and one `compatible_match_found` event — confirming the partial unique index + `ON CONFLICT DO NOTHING` correctly de-duplicates under a race rather than only under sequential calls. Also re-verified via the same probe: wrong-family-ownership, unpublished-candidate, incomplete-profile (with a temporary DDL relaxation to exercise the RPC's independent defense-in-depth check), and suspended-account calls are each rejected (the probe raises `... accepted` exceptions if the RPC wrongly succeeds; none fired).
- **Result:** PASS by runtime execution (upgraded from round 1's "PASS by code inspection only", closing the code review's "UNCERTAIN" acceptance-criteria items for ownership/eligibility, frozen snapshot, view/threshold events, and concurrency).

### TC-006 (re-verify) — E5 scope leakage
- **Scenario:** Re-inspect `CandidateDetailActions` and the detail route for contact/payment/entitlement behavior.
- **Actual:** `components/familia/candidate-detail-actions.tsx` still renders only visually-disabled favorite/contact controls labeled "(próximamente)"/"Próximamente"; no entitlement, `contacto`, or `candidate_contacted` logic is present.
- **Result:** PASS (unchanged from round 1).

## Bugs

### BUG-001 — RESOLVED
Re-verified fixed per TC-003 above. No new functional defect found in the mobile overlay or references section during this round.

## Regression Results

- `npm test -- --run --no-file-parallelism`: **245/245 tests passed** (36 files), including the new `tests/app/familia-candidate-detail.test.tsx` (state-distinction: unavailable vs. retry-capable candidate-query error vs. retry-capable RPC error) and `tests/components/familia/reference-list.test.tsx`.
- `npm run lint`: **passed**.
- `npm run typecheck`: **passed**.
- `npm run check:secrets`: **passed**.
- `npm run build`: **passed**; only the existing Supabase Node 20 deprecation warning was emitted.
- `npm run test:db`: **passed** (exit 0) on two consecutive runs, executing real migrations (through `20260903000012_candidate_profile_view.sql`) plus `scripts/test-necesidad-rpc.mjs` and `scripts/test-e4-03-profile-view.{sql,mjs}` against live Postgres via Docker. No `raise exception` fired in either run; `grep -iE "error|exception|fail"` on the captured logs returned no matches. **Flakiness observed:** one earlier attempt in this session failed during `supabase db reset --local`'s "Restarting containers" step with `Error status 400: DatabaseSchemaMismatch`, before any of the E4-03 probe SQL ran (migrations themselves applied cleanly in that same attempt). This reproduced once, then two consecutive full re-runs succeeded cleanly. This looks like a transient Supabase CLI/PostgREST container-restart race rather than an application or migration defect — it did not correlate with any change to the E4-03 SQL/RPC — but it means `test:db` is not currently 100% reliable as a merge gate on the first try and may need a retry in CI.

## Outstanding non-functional observations (not re-blocking this verdict)

- The working tree still contains unrelated `projects/test-invoice-generator/*` deletions and an untracked `.claude/settings.json`, as flagged in `agent/reviews/code-E4-03-review.md`. This is a repo-hygiene/PR-scope concern, not a functional defect in E4-03 itself, but it should still be excluded from the E4-03 commit/PR before merge.
- Visual QA (`agent/qa/e4-03-visual.md`, verdict REVISE) raised five additional findings (V01–V05: tooltip clipping, tablet hero inset, loading action-bar composition, error-state conflation, reference spacing) that are outside this functional re-verification's scope. V04 (error-state conflation) appears addressed by the new `familia-candidate-detail.test.tsx` retry-capable error states observed above, but Visual QA should independently re-confirm all five findings with rendered/screenshot evidence before E4-03 is marked VERIFIED.

## Recommendation

Functional QA for E4-03 now PASSes: BUG-001 (mobile overlay + references disclosure/contact note/heading treatment) is confirmed fixed in source, and TC-004/TC-005 (pipeline auto-creation, frozen snapshot, analytics events, exact-60 threshold, concurrency, and authorization/eligibility rejections) are now verified by real runtime execution against Postgres via `npm run test:db`, not just code inspection. Before marking E4-03 VERIFIED overall: (1) have Visual QA re-run its authenticated/rendered check to close V01–V05, (2) clean the unrelated `test-invoice-generator`/`.claude/settings.json` scope out of the change set, and (3) note the observed `test:db` container-restart flakiness so CI treats a single transient failure as a retry candidate rather than a real regression.
