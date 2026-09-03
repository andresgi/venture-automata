# Functional QA

## Verdict

**PASS**

All three previously-required code-review fixes hold up under real end-to-end testing
(authorization, double-publish, and RPC candidate/score hardening all behave correctly
against a real local Supabase instance; the "Volver a mis necesidades" link fix works).
End-to-end testing against real, schema-accurate data initially surfaced a new bug
(BUG-001: the "Disponibilidad" availability factor always scored `false` for real niñera
data due to a snake_case/camelCase field-mapping gap in `candidateFromRow`). The Developer
fixed it (mirroring the existing `toMatchNecesidad` translation pattern), fixed the test
fixture that had been masking it, and added a regression test. I re-ran the exact
populated-candidates scenario that originally reproduced the bug, against the real local
Supabase stack with the same real-schema test data, and confirmed the fix: the same
candidate that previously produced `match_score_snapshot: 75` /
`"availability": false` now correctly produces `match_score_snapshot: 100` /
`"availability": true`, with FAM-04 rendering "100%". All other previously-passing
scenarios (zero-candidates empty state, authorization at both the action and RPC layers,
double-publish rejection, RPC ineligible-candidate hardening) are unaffected by this fix's
scope and were not re-run in this follow-up pass per the coordinator's direction, since
the change is isolated to candidate-schedule field mapping and does not touch
authorization, state transitions, or the RPC's eligibility checks.

## Environment

- Nanamex web-only app; Next.js 16.3.4, React 19.2, Vitest 4.1.11, Supabase CLI 2.75.0.
- QA ownership checked (`config/CONSTRAINTS.md`): web QA is agent-driven; no manual/mobile
  QA applicable to this story.
- Branch: `nanamex/e2-02-publish-matching`, working tree as supplied (uncommitted changes
  in `actions/necesidad.ts`, `db/migrations/20260903000011_necesidad_publish_pipeline.sql`,
  `app/familia/necesidad/[id]/page.tsx`, `app/familia/page.tsx`,
  `components/familia/necesidad-wizard.tsx`, `scripts/test-necesidad-rpc.sql`,
  `tests/actions/necesidad.test.ts`), plus the Developer's BUG-001 fix landed in the same
  files during this QA pass.
- **Real local Supabase stack used throughout** (Docker-based `supabase start` /
  `supabase db reset --local`), not mocks, per the story's testing brief:
  - `supabase db reset --local` applied all 11 migrations cleanly, including
    `20260903000011_necesidad_publish_pipeline.sql`.
  - `npm run test:db` (the project's existing `scripts/test-necesidad-rpc.sql` RPC fixture,
    which independently covers owner/state checks and the
    invalid/unpublished/suspended/out-of-range-score RPC rejections) — **PASS**.
  - Two throwaway Vitest end-to-end harnesses (`tests/tmp-e2e-e2-02-qa.test.ts` for the
    initial full pass, `tests/tmp-e2e-e2-02-qa-recheck.test.ts` for the BUG-001 re-check —
    both deleted before finishing, never committed) drove the **real, unmodified**
    `publishNecesidadAction` and the real `MatchesPage` (FAM-04) Server Component against
    the real local Postgres/PostgREST instance. `@/lib/supabase/auth-server`'s
    `createServerSupabaseClient` and `next/navigation`'s `redirect` were mocked (the same
    established pattern as `tests/app/familia-necesidad.test.tsx`) purely to stand in for
    Next.js's request-scoped cookie/session plumbing, which cannot be constructed outside
    a running Next.js request — this is a test-harness boundary, not a mock of any
    business logic under test. All data access (`profiles`, `necesidades`,
    `necesidad_children`, `perfil_ninera`, `ninera_zonas`,
    `ninera_experiencia_edades`, the `publish_necesidad_with_matches` RPC, `pipeline`) went
    through the real, unmodified `createServiceRoleClient()` against the real DB. Test
    fixture users were seeded via direct `auth.users` row insertion (the same technique
    already established in `scripts/test-necesidad-rpc.sql`) since this Supabase CLI
    version's GoTrue admin API rejected both the `.env.local` and the CLI's own reported
    service-role keys for `auth.admin.createUser` (`bad_jwt` / "signing method HS256 is
    invalid") — a local-environment quirk unrelated to the app, documented in case it
    recurs for a future QA pass.
  - No Chromium/Playwright/Puppeteer tooling is available in this environment (same
    constraint noted in `agent/qa/e2-01-functional-qa.md`); the FAM-04 page's actual
    rendered output was verified by invoking the real Server Component function directly
    and asserting on its rendered DOM via `@testing-library/react`, using real DB rows as
    input — this exercises the true production render path (data fetch → JSX → DOM text),
    just without a browser chrome/viewport around it. No visual/layout claims are made
    here; that remains Visual QA's scope.
  - `npm test` (final, post-fix, post-cleanup): 23 files / **195 tests — PASS** (194
    pre-fix + 1 new Developer-added regression test for BUG-001).
  - `npm run lint`: PASS. `npm run typecheck`: PASS. `npm run build`: PASS (only the
    pre-existing Node 20 Supabase deprecation warning, unrelated to this story).
  - The DB was reset to a clean state after each QA pass; no QA fixture data or files
    remain in the working tree (`git status` confirmed identical to the supplied diff plus
    the Developer's fix, with no stray QA artifacts).

## Test Cases

### TC-01 — Zero-candidates publish reaches the documented FAM-04 empty state
- **Scenario:** A familia account publishes a complete draft necesidad while zero
  `perfil_ninera` rows exist anywhere in the DB (the real seed data ships none).
- **Expected:** `estado` transitions `borrador -> activa`; no pipeline rows are created;
  the family is redirected to `/familia/necesidad/{id}`; that page renders the
  `UX-spec.md:247-251` empty-state copy, not an error; the "Volver a mis necesidades" link
  (the developer's fix for the code review's Issue 3) is present and points at `/familia`.
- **Actual:** PASS. `publishNecesidadAction` returned `{status:"published", necesidadId}`;
  `necesidades.estado` was `activa` in the DB; `pipeline` had 0 rows for that
  `necesidad_id`; `MatchesPage` (invoked directly, real DB) rendered
  "Aún no encontramos candidatas para esta necesidad" and a link with
  `href="/familia"` and accessible name "Volver a mis necesidades".
- **Result:** PASS. (Not re-run after the BUG-001 fix; unaffected code path.)

### TC-02 — Populated-candidates publish persists a real snapshot and FAM-04 reflects it exactly
- **Scenario:** One `perfil_ninera` candidate constructed to satisfy all five weighted
  factors (`architecture.md` §15) using the real, documented `database.md`-shape data
  (snake_case `disponibilidad`, matching zona, salary range, modalidad, child age range,
  ≥2 years experience). Publish the necesidad and inspect both the DB and the FAM-04 page.
- **Expected:** A `pipeline` row is created with a real `match_score_snapshot` and
  `match_checklist_snapshot`; FAM-04 renders a candidate card whose displayed score/
  checklist match the DB row exactly; a fully-matching candidate scores 100.
- **Actual (initial pass):** BUG FOUND (BUG-001). With a candidate whose `disponibilidad`
  exactly overlapped the necesidad's requested schedule (both using `database.md`'s
  documented shape), the resulting DB row was:
  ```json
  { "match_score_snapshot": 75, "match_checklist_snapshot": {
      "location": true, "experience": true, "availability": false,
      "salaryOverlap": true, "childAgeOverlap": true } }
  ```
  FAM-04 correctly rendered whatever was in the DB (75%), but the persisted score itself
  was wrong.
- **Actual (re-check, after the Developer's fix to `candidateFromRow`):** PASS. Re-ran the
  identical scenario (same fixture-construction approach, real local Supabase, real
  `publishNecesidadAction` and `MatchesPage`) against the fixed code:
  ```json
  {
    "match_score_snapshot": 100,
    "match_checklist_snapshot": {
      "location": true, "experience": true, "availability": true,
      "salaryOverlap": true, "childAgeOverlap": true
    }
  }
  ```
  FAM-04 rendered "100%" for the candidate card. `npx vitest run
  tests/tmp-e2e-e2-02-qa-recheck.test.ts --reporter=verbose` — 1 passed, confirming both
  the DB-persisted values and the rendered page text.
- **Result:** PASS (BUG-001 resolved; re-verified against real data end-to-end, not just
  by reading the diff).

### TC-03 — Authorization: action layer rejects publishing another family's draft
- **Scenario:** Family B (authenticated) submits family A's `borrador` `draft_id` to
  `publishNecesidadAction`.
- **Expected:** Rejected; `estado` remains `borrador`.
- **Actual:** PASS. `publishNecesidadAction` returned `{status:"error", ...}`; `estado`
  remained `borrador` in the DB (the action's own `.eq("familia_id", user.id)` filter finds
  no row).
- **Result:** PASS. (Not re-run after the BUG-001 fix; unaffected code path.)

### TC-04 — Authorization: RPC layer independently rejects a mismatched `familia_id`
- **Scenario:** Call `publish_necesidad_with_matches` directly (bypassing the action
  entirely) with family A's draft ID but family B's `p_familia_id`.
- **Expected:** Rejected server-side at the DB/RPC boundary, not just hidden in the UI.
- **Actual:** PASS. The RPC raised `draft_not_publishable`; `estado` remained `borrador`.
  This confirms the code review's noted defense-in-depth (`FOR UPDATE` owner/state check)
  holds independently of the application-layer check in TC-03.
- **Result:** PASS. (Not re-run after the BUG-001 fix; unaffected code path.)

### TC-05 — Double-publish / already-active necesidad is rejected, not duplicated
- **Scenario:** Publish a complete draft with one eligible candidate (own modalidad lane
  to avoid cross-test contamination — see Environment), then call
  `publishNecesidadAction` again on the same, now-`activa` necesidad.
- **Expected:** First publish succeeds with exactly one pipeline row; second publish is
  rejected by the RPC's `estado = 'borrador'` check; no duplicate/second pipeline row;
  `estado` stays `activa`.
- **Actual:** PASS. First call: `status:"published"`, 1 pipeline row. Second call:
  `status:"error"`. Final state: `estado = "activa"`, still exactly 1 pipeline row, same
  `ninera_id` as the first publish.
- **Result:** PASS. (Not re-run after the BUG-001 fix; unaffected code path.)

### TC-06 — RPC hardening: ineligible/unpublished candidate rejected atomically, through the app's real service-role client
- **Scenario:** Call `publish_necesidad_with_matches` (via the app's real, unmodified
  `createServiceRoleClient()`, using the exact `{ninera_id, match_score_snapshot,
  match_checklist_snapshot}` shape `actions/necesidad.ts:146-150` constructs) with one
  genuinely eligible candidate and one `perfil_completo=true, publicado=false` candidate
  (a real, legitimate "complete but not yet published" niñera state) in the same call.
- **Expected:** The RPC rejects the whole call (defense-in-depth per the just-applied
  fix), and the rejection is atomic — no partial commit of the otherwise-valid eligible
  match, and `estado` stays `borrador`.
- **Actual:** PASS. The RPC raised `invalid_match_candidate: ... is not an eligible
  published niñera`; `estado` remained `borrador`; zero pipeline rows were created (the
  otherwise-valid eligible match was correctly rolled back with it).
- **Result:** PASS. This corroborates the SQL-fixture-level result already in
  `scripts/test-necesidad-rpc.sql`, now confirmed through the app's own real client. (Not
  re-run after the BUG-001 fix; unaffected code path — the fix touches candidate-schedule
  mapping, not RPC eligibility checks.)

### TC-07 — Ineligible candidate never reaches the RPC via the real action path in the first place
- **Scenario:** With the same unpublished candidate present, call the real
  `publishNecesidadAction` (not the raw RPC) for a family with one eligible + one
  unpublished candidate available.
- **Expected:** The unpublished candidate does not appear in the resulting pipeline.
- **Actual:** PASS. The action's own candidate query (`.eq("publicado", true)`) excludes
  the unpublished niñera before `computeMatches` ever runs, so the RPC's defense-in-depth
  check in TC-06 is — correctly, by design — structurally unreachable through this
  specific action today. Only the eligible candidate's ID appeared in the final pipeline.
- **Result:** PASS (confirms the fix's defense-in-depth is real defense-in-depth, not the
  primary gate, and does not regress the primary application-layer filter). (Not re-run
  after the BUG-001 fix; unaffected code path.)

## Bugs

### BUG-001 — Availability factor always scored `false` for real niñera data (shape mismatch) — RESOLVED

- **Severity:** High (as originally filed). This is the matching engine's core
  weighted-scoring output — the single most product-critical piece of business logic per
  the implementation plan's own characterization of E3-01/E3-02 — and it was silently
  wrong for every real candidate on every publish, not just an edge case.
- **Reproduction (as originally found):**
  1. Seed a `perfil_ninera` row with `disponibilidad` in the schema's documented shape,
     e.g. `[{"dia":"lun","hora_inicio":"08:00","hora_fin":"18:00"}]`
     (`engineering/database.md:71`), fully covering a necesidad's requested
     `dias_horarios` (e.g. `[{"dia":"lun","hora_inicio":"09:00","hora_fin":"17:00"}]`).
  2. Publish that necesidad via `publishNecesidadAction`.
  3. Inspect the resulting `pipeline.match_checklist_snapshot`.
- **Expected:** `availability: true`, contributing `MATCH_WEIGHT_AVAILABILITY` (25 points)
  to the score, per `lib/matching/match-score.ts`'s `availabilityCovers`/`schedulesOverlap`.
- **Originally observed:** `availability: false` always, score `75` instead of `100` for an
  otherwise-fully-matching candidate. Root cause: `candidateFromRow` in
  `actions/necesidad.ts` read `row.disponibilidad` and cast it directly to
  `MatchCandidate["ninera"]["disponibilidad"]` with no key translation, while
  `perfil_ninera.disponibilidad` is documented (and, by symmetry with
  `necesidad.dias_horarios`) snake_case (`hora_inicio`/`hora_fin`), and
  `schedulesOverlap` reads camelCase (`horaInicio`/`horaFin`). The necesidad side of the
  same mapping (`toMatchNecesidad`, same file) already did this translation correctly —
  the niñera side of the identical translation had simply never been written.
- **Fix applied (verified in this pass):** `candidateFromRow` now maps
  `row.disponibilidad`'s `hora_inicio`/`hora_fin` into `horaInicio`/`horaFin` before
  constructing the `MatchCandidate`, explicitly mirroring `toMatchNecesidad`'s existing
  pattern, with an inline comment naming BUG-001. `tests/actions/necesidad.test.ts`'s
  `fullyMatchingRow` fixture was corrected to use the real snake_case shape, and a new
  regression test was added.
- **Re-verification performed:** Re-ran the exact populated-candidates scenario that
  originally reproduced the bug (`tests/tmp-e2e-e2-02-qa-recheck.test.ts`, deleted after
  the run — never committed) against a freshly reset real local Supabase instance, using
  the same real-schema test data and the same real, unmodified `publishNecesidadAction` /
  `MatchesPage`. Result: `match_score_snapshot: 100`, `match_checklist_snapshot.availability:
  true`, and FAM-04 rendered "100%" for the candidate card — confirming the fix end-to-end,
  not just at the code-diff level.
- **Regression coverage confirmed:** `npm test` now runs 195 tests (194 + 1 new), all
  passing; the new/updated test in `tests/actions/necesidad.test.ts` uses the real
  documented snake_case fixture shape, so this specific regression can no longer hide
  behind a fixture that assumes the (wrong) camelCase shape.
- **Affected requirement (now satisfied):** `engineering/implementation-plan.md` E2-02
  acceptance criterion "publishing calls `computeMatches` and persists the initial
  match/pipeline results"; `engineering/architecture.md` §15's weighted-factor table;
  `design/UX-spec.md` FAM-04's "✓ Disponible L–V" example checklist line.
- **Status:** RESOLVED. Verified end-to-end against real data, not merely by reading the
  diff or re-running mocked unit tests.

## Regression Results

- `npm run test:db` (local Supabase reset + `scripts/test-necesidad-rpc.sql`): **PASS**.
- `npm test` (final, post-fix): **PASS — 23 files, 195 tests** (up from 194 — one new
  Developer-added BUG-001 regression test).
- `npm run lint`: **PASS.**
- `npm run typecheck`: **PASS.**
- `npm run build`: **PASS** (only the pre-existing, unrelated Node 20/Supabase deprecation
  warning).
- E1-03/E2-01 regression (family onboarding, wizard, draft autosave): covered by the same
  `npm test` run above; no related failures.

## Recommendation

**PASS.** All acceptance criteria for E2-02 hold up under real end-to-end testing against
a live local Supabase instance: server-side `borrador -> activa` transition, initial match
computation and pipeline persistence (now scoring correctly, per BUG-001's verified fix),
the documented FAM-04 empty state with a working recovery link, and server-side
authorization against publishing another family's draft (checked at both the action and
RPC layers). Double-publish is correctly rejected with no duplicate pipeline rows, and the
RPC's defense-in-depth hardening against fabricated/ineligible candidates holds even when
invoked through the app's real service-role client, while the primary application-layer
filter correctly keeps ineligible candidates from ever reaching that path in normal
operation. No open functional bugs remain. Clear to proceed to the next stage of the
workflow (Security Review / Product Acceptance, per the implementation plan's ordering).
