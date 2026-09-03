# Code Review

## Verdict

REVISE

## Critical Issues

None found.

## Important Issues

1. **Match ranking ignores profile completeness.** `actions/necesidad.ts:83-85` reads `row.profile_completeness`, but the query at `actions/necesidad.ts:115-117` selects `perfil_completo`, and the database spec defines that boolean field in `database.md:75-76`. Consequently every candidate gets `profileCompleteness = 0` and the required completeness tie-break in `architecture.md:336-340` is never applied. Equal-score candidates can therefore be ordered incorrectly. Map the selected field to the ranking value expected by E3-02 (or reconcile the schema/type contract), and add a non-zero completeness ranking test through this action.

2. **The publish RPC trusts arbitrary match snapshots and candidate IDs.** `db/migrations/20260903000011_necesidad_publish_pipeline.sql:34-37` inserts every element of `p_matches` without checking that each `ninera_id` is a published, complete, active niñera eligible for the necesidad, or that score/checklist values are valid. Although execution is revoked from client roles (`:41-42`), this is still the service-role write boundary and the only atomic persistence step. A server-side regression, compromised internal caller, or future reuse can publish pipeline rows for an unrelated profile or persist fabricated scores. Validate candidates/snapshot shape in the RPC or move the trusted computation/persistence contract behind a stricter database interface; test invalid IDs and ineligible candidates.

3. **The documented empty-state recovery cannot edit the published necesidad.** `app/familia/necesidad/[id]/page.tsx:15` links an empty result to `/familia/necesidad?draft={id}`, but `app/familia/necesidad/page.tsx:16` loads only rows with `estado = borrador`. After publication, that link yields a blank/new wizard rather than the active necesidad. The UX explicitly requires actionable guidance back to editing (`design/UX-spec.md:247-251`), while architecture permits edits to active necesidades (`engineering/architecture.md:402-422`). Either implement the intended edit path as part of this flow or avoid presenting a misleading edit link until E2-04 supplies it.

## Minor Issues

- `app/familia/necesidad/[id]/page.tsx:15` uses raw `<a>` rather than `next/link`; this is not a correctness blocker but causes a full navigation for the recovery action.
- `actions/necesidad.ts:109-112` discards database read errors and reports them as "cannot publish." This is safe but makes operational failures indistinguishable from authorization/not-found cases.
- `app/familia/necesidad/[id]/page.tsx:15` renders only the snapshot and "Perfil disponible próximamente"; the full FAM-04 card/profile behavior is correctly owned by E4-01/E4-03, but this story's populated redirect is only minimally useful until those stories land.

## Security Observations

- Positive: publish requires an authenticated user, verifies `profiles.role = familia`, scopes the draft read by both `id` and `familia_id`, and requires `estado = borrador` (`actions/necesidad.ts:103-112`). The RPC repeats owner/state checks under `FOR UPDATE` (`db/migrations/20260903000011_necesidad_publish_pipeline.sql:25-26`), preventing publishing another family's draft through the normal action.
- Positive: the RPC is `SECURITY DEFINER` with a restricted `search_path` and is executable only by `service_role` (`:21-22`, `:41-42`).
- The trust issue in Important Issue 2 is also a data-integrity/security-boundary concern: service-role callers can currently inject pipeline rows for arbitrary profiles.

## Test Coverage Observations

- Targeted automated tests pass: 2 files, 16 tests (`npm test -- --run tests/actions/necesidad.test.ts tests/components/familia/necesidad-wizard.test.tsx`).
- Coverage is insufficient for the changed behavior: no non-empty candidate publish test, no score/checklist snapshot assertion, no ranking/completeness assertion, no RPC rollback test when a match insert fails, no invalid/ineligible candidate test, no already-active/idempotent publish test, and no redirect/deep-link test for FAM-04.
- `scripts/test-necesidad-rpc.sql:30-35` covers owner/state and zero-match success, but not the RPC's unchecked match payload or atomic rollback across a failing pipeline insert.
- The action tests mock the Supabase query builder and do not exercise the real migration/RPC contract (`tests/actions/necesidad.test.ts:64-72`).

## Acceptance Criteria Assessment

- **Publish transitions `estado: borrador -> activa` server-side:** PASS — enforced by the RPC's locked owner/state check and update (`db/migrations/20260903000011_necesidad_publish_pipeline.sql:25-33`).
- **Publishing calls `computeMatches` and persists initial match/pipeline results:** UNCERTAIN — the action calls `computeMatches` (`actions/necesidad.ts:119-123`) and the RPC persists rows atomically, but the non-empty path is untested and currently mis-maps completeness (`actions/necesidad.ts:83-85`); snapshot/candidate integrity is not enforced by the RPC.
- **Successful publish redirects to FAM-04:** PASS — the client routes to `/familia/necesidad/${result.necesidadId}` after a published result (`components/familia/necesidad-wizard.tsx:30`), and the destination is the FAM-04 page.
- **Zero eligible niñeras reaches the documented FAM-04 empty state instead of an error:** PASS — empty matches are sent as `[]` and the destination renders the empty state (`actions/necesidad.ts:119-125`; `app/familia/necesidad/[id]/page.tsx:15`), with the SQL smoke test covering zero rows.
- **Server-side authorization prevents publishing another family's draft:** PASS — the action and RPC both bind the draft to the authenticated family (`actions/necesidad.ts:103-112`; `db/migrations/20260903000011_necesidad_publish_pipeline.sql:25-26`).

## Required Changes

1. Fix the `perfil_completo`/`profile_completeness` contract so E2-03 ranking follows the architecture's completeness tie-break, and add coverage with candidates of equal score but different completeness.
2. Harden `publish_necesidad_with_matches` against invalid/ineligible candidate IDs and fabricated snapshots, with integration tests for rejection/rollback.
3. Correct the empty-state "Editar necesidad" behavior: provide an active-necesidad edit route/action, or remove/change the link until that capability exists.
4. Add a non-empty end-to-end publish test asserting candidate IDs, scores, checklist snapshots, and final pipeline state.

---

# Re-review (post-fix verification)

## Verdict

PASS_WITH_MINOR_ISSUES

## Scope of this pass

Verified the three Required Changes from the original REVISE, sanity-checked nothing else broke, independently re-ran automated checks, and confirmed the developer's newly-flagged (deliberately deferred) `disponibilidad` shape issue is real.

## Verification of Required Change 1 — `profile_completeness`/`perfil_completo` mismatch

**Genuinely fixed.** `actions/necesidad.ts:90-92` adds `profileCompletenessScore()`, mapping the boolean `perfil_completo` onto the 0-100 scale the `MatchCandidate` contract expects (`true -> 100`, `false -> 0`), and `candidateFromRow()` now reads `row.perfil_completo` (`actions/necesidad.ts:100`) instead of the nonexistent `row.profile_completeness`.

- **"No-op today" claim confirmed accurate.** The candidate query in `publishNecesidadAction` (`actions/necesidad.ts:138-140`) does filter `.eq("publicado", true).eq("perfil_completo", true).eq("profiles.account_status", "activa")`, so within this action every candidate that reaches `candidateFromRow` already has `perfil_completo = true`. The tie-break is currently inert for this call site, exactly as the developer's comment (`actions/necesidad.ts:78-89`) states, and will do real work automatically the moment a graduated completeness signal is introduced or this helper is reused without the eligibility filter. This is an honest, well-documented characterization, not a hidden no-op.
- **New test genuinely isolates the tie-break.** `tests/actions/necesidad.test.ts:101-117` ("ranks an equally-scored, more complete profile ahead of a less complete one") constructs two candidates with identical score (100), identical `createdAt`, but `profile_id` values chosen so that alphabetical id order (`"aaa-incomplete"` < `"zzz-complete"`) is the *opposite* of the expected result. Reading `lib/matching/compute-matches.ts:29-35`, `compareMatches`'s tie-break chain is score desc → completeness desc → `createdAt` asc → `id` asc. With score and `createdAt` tied, if the completeness fix were absent (defaulting both to 0), the sort would fall through to the `id` ascending tie-break and produce `["aaa-incomplete", "zzz-complete"]`. The test instead asserts `["zzz-complete", "aaa-incomplete"]` (`tests/actions/necesidad.test.ts:115`), which can only happen if `profileCompleteness` (100 vs 0) is actually driving the ordering. This is a genuine regression test, not one that would pass by coincidence under id-based ordering. Ran independently: `npm test -- --run tests/actions/necesidad.test.ts` → 10/10 pass.

No issues found with this fix.

## Verification of Required Change 2 — RPC trust-boundary hardening

**Genuinely fixed.** Read `db/migrations/20260903000011_necesidad_publish_pipeline.sql:34-61` in full.

- Join/validation logic (`:45-54`) checks, for every `ninera_id` in `p_matches`: `perfil_ninera.publicado = true`, `perfil_ninera.perfil_completo = true` (joined by `pn.profile_id = (v_match->>'ninera_id')::uuid`), and `profiles.account_status = 'activa'` (joined `p.id = pn.profile_id`). Join keys are correct and match the schema (`perfil_ninera.profile_id` is the PK/FK to `profiles.id`).
- Score-range check (`:55-57`) rejects `match_score_snapshot` outside `0..100`.
- Both checks `raise exception` (not a silent `continue`/skip), which aborts the whole `plpgsql` function invocation. Since the `estado = 'activa'` update (`:33`) happens earlier in the same function body with no exception handler around the loop, a raised exception rolls back that update too — the whole publish is atomic, not partially applied. Confirmed empirically via `npm run test:db` (see below), not just by reading the SQL.
- No bypass path found: the loop iterates every element of `p_matches` and validates each one individually before insert; there is no early-return or short-circuit that would let a later invalid element skip validation, and `on conflict (necesidad_id, ninera_id) do nothing` (`:60`) is only reached after both checks pass.
- Grants are unchanged and correct: `revoke ... from public, anon, authenticated` / `grant ... to service_role` (`:64-65`).

**Test quality — confirmed non-vacuous.** Read all 5 new cases in `scripts/test-necesidad-rpc.sql:41-110`:
1. `:68-75` — nonexistent `ninera_id` (`gen_random_uuid()` with no matching row) → asserts exception raised, `estado` still `'borrador'`, `pipeline` count `0`.
2. `:77-84` — a real niñera that is `perfil_completo = true` but `publicado = false` (a genuine intermediate state, seeded at `:59-62`) → asserts rejection and full rollback.
3. `:86-93` — a real niñera that is `publicado = true, perfil_completo = true` but `profiles.account_status = 'suspendida'` → asserts rejection and full rollback.
4. `:95-102` — an eligible niñera but `match_score_snapshot = 150` (out of range) → asserts rejection and full rollback.
5. `:105-110` — a fully eligible niñera with a valid score → asserts the publish *succeeds*, `estado = 'activa'`, one pipeline row persisted with the correct score.

These are genuine attempts to insert ineligible data and assert rejection, not trivial/tautological checks — each negative case checks both that an exception was raised *and* that the `borrador`→`activa` transition and any partial pipeline inserts were rolled back, and the final positive case checks the fix doesn't over-reject legitimate matches. Independently ran `npm run test:db` (fresh `supabase db reset --local` + this script) myself: it completed cleanly through all `DO` blocks and ended in `ROLLBACK` with no raised/unhandled exception output, confirming the current (fixed) migration state passes.

No issues found with this fix.

## Verification of Required Change 3 — broken "Editar necesidad" empty-state link

**Genuinely fixed.** `app/familia/necesidad/[id]/page.tsx:1` imports `Link` from `next/link`, and the empty-state CTA (`:23`) is `<Link ... href="/familia">Volver a mis necesidades</Link>` — a real `next/link`, not a raw `<a>`, with no remaining reference to `/familia/necesidad?draft={id}` anywhere in the file. `:16-22` documents the deferral to E2-04 inline, correctly explaining *why* it doesn't link to the draft-only route. `/familia` (`app/familia/page.tsx`) is a real, existing dashboard route.

One residual observation (not a defect in this fix, since it's explicitly out of scope and documented as such): `/familia`'s `FamiliaDashboard` (`app/familia/page.tsx:36-49`) only lists `estado = 'borrador'` rows (`app/familia/page.tsx:32`), so a family following "Volver a mis necesidades" from a published (`activa`) necesidad's empty state won't actually see that necesidad listed there either. This is honest (no longer produces a broken/blank wizard) and is consistent with the developer's stated E2-04 deferral, so it does not block this fix — but it means the empty-state's practical recovery value is still limited until E2-04 lands. Recommend tracking this explicitly in the E2-04 backlog item rather than letting it surface as a surprise later.

## Verification of flagged-but-deferred issue — `disponibilidad` camelCase/snake_case mismatch

**Confirmed real.** `engineering/database.md:71` documents `perfil_ninera.disponibilidad` as `jsonb`, `Array of {dia: enum(lun..dom), hora_inicio: time, hora_fin: time}` — snake_case, and explicitly the "same shape as `perfil_ninera.disponibilidad`" cross-reference appears again at `database.md:148` for `necesidades.dias_horarios`. In `actions/necesidad.ts`, the `necesidad` side is correctly translated: `toMatchNecesidad()` (`:67-76`) maps `item.hora_inicio` → `horaInicio` and `item.hora_fin` → `horaFin` (`:74`). But `candidateFromRow()` (`:104`) does `disponibilidad: (row.disponibilidad as MatchCandidate["ninera"]["disponibilidad"]) ?? []` — a direct type-cast with no key translation, implicitly assuming the column already contains camelCase `horaInicio`/`horaFin` keys matching `MatchScheduleEntry` (`lib/matching/match-score.ts:18-22`). Per `database.md`, real rows will be snake_case, so `schedulesOverlap`/`availabilityCovers` (`lib/matching/match-score.ts:65-72`, consuming `.horaInicio`/`.horaFin`) would silently receive `undefined` for every real niñera row, always failing the `availability` match factor (`lib/matching/match-score.ts:89`) once real data exists.

**Confirmed no niñera-side write path yet exists** that would already be producing the camelCase shape the code assumes: `grep -rn "perfil_ninera"` across `.ts`/`.sql` outside tests/migrations shows the only application-code reference to `perfil_ninera` is this same read in `actions/necesidad.ts:138-140`; the only writes are the DDL/RLS/trigger definitions in `db/migrations/20260902000006_perfil_ninera.sql` and `20260902000007_security_hardening.sql` (RLS policies and system-field-protection triggers, not row-shape producers), and no onboarding action/route inserts into this column. So today this is entirely latent — `tests/actions/necesidad.test.ts:82-89` correctly documents this exact gap inline and deliberately builds its fixtures with the code's current (wrong per spec) camelCase assumption so the new ranking/publish tests exercise real logic rather than papering over the bug.

This should be tracked as a real defect against whichever future story implements niñera-side `disponibilidad` writes/onboarding (or fixed proactively in `candidateFromRow` now, converting snake_case to camelCase the same way `toMatchNecesidad` already does) — not silently left for someone to discover via a broken availability factor in production. Recommend adding this explicitly to `agent/BACKLOG.md` or `agent/BLOCKERS.md` referencing `actions/necesidad.ts:104` before the niñera onboarding story that writes this column is marked complete.

## Other independently verified items

- `app/familia/page.tsx:2,48,49` and `:52-53`: raw `<a>` → `next/link` conversions, correct hrefs preserved (`/familia/necesidad`, `/familia/necesidad?draft=${draft.id}`). Not required by the 3 fixes but a reasonable drive-by cleanup; no regression.
- Server-side error logging added at the three failure branches in `publishNecesidadAction` (`actions/necesidad.ts:128-134` necesidad-read error, `:141-144` candidate-read error, `:151-153` RPC error): each `console.error`s a distinct internal message server-side while the user-facing `message` strings are unchanged from before ("No puedes publicar este borrador.", "No se pudieron calcular las candidatas. Intenta de nuevo.", "No se pudo publicar la necesidad. Intenta de nuevo."). No stack traces, internal IDs, or Supabase error internals are returned to the client — confirmed no information disclosure was introduced. This also resolves the original review's Minor Issue about indistinguishable operational-vs-authorization failures, from the server's own logs.
- Independently re-ran validation rather than only trusting the developer's report: `npm run lint` clean, `npx tsc --noEmit` clean, `npm test -- --run` → 23 files / 194 tests pass, `npm run test:db` passes (fresh reset + full `scripts/test-necesidad-rpc.sql`, ending in a clean `ROLLBACK`).
- Sanity-checked the rest of the working-tree diff (`components/familia/necesidad-wizard.tsx`, `app/familia/page.tsx`) for regressions: the wizard's new review/publish step wiring (`publish()` at the added line, `Review` component) is additive and consistent with the FAM-04 redirect contract already covered by the original review's acceptance-criteria assessment; nothing here reopens any of the 3 fixed issues.

## Test Coverage Observations (re-review)

- Required Change 4 from the original review ("add a non-empty end-to-end publish test asserting candidate IDs, scores, checklist snapshots, and final pipeline state") is also now satisfied, even though it wasn't one of the 3 changes explicitly re-verified: `tests/actions/necesidad.test.ts:119-138` ("publishes non-empty results with candidate ids, scores, and checklist snapshots") asserts the exact `p_matches` payload including `ninera_id`, `match_score_snapshot`, and `match_checklist_snapshot`.
- Test coverage for this story is now substantially improved: the zero-candidate path, non-empty candidate path, completeness tie-break, and five RPC-hardening rejection/acceptance cases are all covered. Remaining gap (pre-existing, not introduced by this fix pass): the action-level tests still mock the Supabase query builder rather than exercising the real migration/RPC contract end-to-end in the same test run — the SQL script and the Vitest suite are complementary but separate, run manually/via separate npm scripts (`npm run test:db` vs `npm test`) rather than a single integrated CI-verified pipeline. Not a blocker; worth noting for future CI hardening.

## Acceptance Criteria Assessment (re-review)

- **Publish transitions `estado: borrador -> activa` server-side:** PASS — unchanged from original, still enforced by the RPC (`db/migrations/20260903000011_necesidad_publish_pipeline.sql:25-33`).
- **Publishing calls `computeMatches` and persists initial match/pipeline results:** PASS (upgraded from UNCERTAIN) — non-empty path is now tested (`tests/actions/necesidad.test.ts:119-138`), completeness mapping is fixed and tested (`:101-117`), and the RPC now enforces candidate/snapshot integrity server-side (`db/migrations/20260903000011_necesidad_publish_pipeline.sql:45-57`) with passing rejection/acceptance tests (`scripts/test-necesidad-rpc.sql:68-110`).
- **Successful publish redirects to FAM-04:** PASS — unchanged, `components/familia/necesidad-wizard.tsx` publish handler routes to `/familia/necesidad/${result.necesidadId}`.
- **Zero eligible niñeras reaches the documented FAM-04 empty state instead of an error:** PASS — unchanged, and the empty-state's recovery link is now correct (`app/familia/necesidad/[id]/page.tsx:23`) instead of broken.
- **Server-side authorization prevents publishing another family's draft:** PASS — unchanged, still enforced at both the action and RPC layer, plus now further hardened against ineligible candidate injection.

## Required Changes

None required to merge. Two items should be tracked (not blocking):

1. Track the confirmed-real `disponibilidad` snake_case/camelCase mismatch in `candidateFromRow()` (`actions/necesidad.ts:104`) against the niñera onboarding story that will first write real data to `perfil_ninera.disponibilidad` — either fix it proactively now (mirror `toMatchNecesidad`'s `hora_inicio`/`hora_fin` → `horaInicio`/`horaFin` mapping) or add an explicit backlog/blocker entry so it isn't rediscovered as a silent availability-matching failure in production.
2. Track that `/familia`'s dashboard doesn't yet list active (`estado = 'activa'`) necesidades, so the new "Volver a mis necesidades" empty-state link, while no longer broken, still can't get a family back to a specific published necesidad until E2-04's active-necesidad view/edit capability lands.

---

# Second Re-review (BUG-001 disponibilidad fix verification)

## Context

Functional QA exercised the previously-untested populated-candidates path with real, schema-accurate data (real published candidate, availability fully covering the necesidad's schedule) and observed `match_score_snapshot = 75` instead of the expected `100`. This confirms Item 1 tracked in the prior re-review's "Required Changes" ("track the confirmed-real `disponibilidad` snake_case/camelCase mismatch") was not merely a future-facing latent risk — it was already live and produces an incorrect, silently-degraded Match Score for every real candidate today. This review corrects my prior "should be tracked" framing: the bug was reachable in the current build, not purely deferred/future-onboarding-dependent. The developer has since applied a fix; this section verifies it.

## Verdict

PASS

## Verification of the `candidateFromRow` fix

**Genuinely fixed, and correctly mirrors `toMatchNecesidad`'s existing pattern.** Read `actions/necesidad.ts:94-118` in full (current state):

- A new `StoredDisponibilidad` type (`:94`) documents the real DB shape (`dia`, `hora_inicio`, `hora_fin`), matching `engineering/database.md:71`.
- `candidateFromRow` now reads `row.disponibilidad` into that typed shape (`:100`) and maps it (`:113`): `disponibilidad.map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin }))`.
- This is structurally identical to `toMatchNecesidad`'s existing, previously-correct translation for the necesidad side (`actions/necesidad.ts:74`): `row.dias_horarios.map((item) => ({ dia: item.dia, horaInicio: item.hora_inicio, horaFin: item.hora_fin }))`. Same field names, same direction of translation (snake_case DB → camelCase `MatchScheduleEntry`), same `.map()` construction — this is a faithful mirror of the sibling code, not a divergent one-off fix.
- An inline comment at `:107-112` explains the mismatch, cross-references `database.md §3` and `toMatchNecesidad`, and names it `BUG-001` for traceability — good practice for a defect that was silently live in production-shaped data.
- No other call site of `candidateFromRow` or the removed cast exists; grepped for other consumers of `MatchCandidate["ninera"]["disponibilidad"]` and found only this one production path (`actions/necesidad.ts`) and the test file, both now consistent.

## Verification of the corrected fixture and new regression test

Read `tests/actions/necesidad.test.ts` in full (current state):

- **Fixture fix confirmed.** `fullyMatchingRow` (`:87-96`) now builds `disponibilidad: [{ dia: "lun", hora_inicio: "09:00", hora_fin: "17:00" }]` — the real snake_case DB shape — where it previously used the wrong camelCase shape that happened to match the (buggy) production code and therefore masked the defect. The inline comment at `:82-86` explicitly documents that this is the real Postgres shape and that it's what caught BUG-001. This is not a superficial rename: it changes what the fixture actually asserts is being handled correctly, and every test using `fullyMatchingRow` (the completeness tie-break test at `:98-114`, and the non-empty publish test at `:140-159`) now exercises the real translation path instead of accidentally bypassing it.
- **New regression test genuinely isolates the availability factor.** `tests/actions/necesidad.test.ts:116-138` ("scores a candidate's real snake_case disponibilidad as available (BUG-001 regression)") constructs a candidate that is a poor fit on every other factor: `ninera_zonas` zona `"Otra zona"` (necesidad needs `"Centro"` → `location: false`), `salario_min/max` `900-950` against the necesidad's `pagoMin/pagoMax` `100/200` (necesidad's fixture, `storedForMatching`, → no overlap → `salaryOverlap: false`), `ninera_experiencia_edades` `"6-12"` against necesidad's `children: ["0-1"]` (→ `childAgeOverlap: false`), `anos_experiencia: 0 < MATCH_MIN_EXPERIENCE_YEARS (2)` (→ `experience: false`), and `disponibilidad` `lun 08:00-18:00` fully covering the necesidad's `lun 09:00-17:00` (→ `availability: true` if and only if the snake_case→camelCase translation is applied). I independently traced the weight arithmetic against `lib/matching/match-score.ts` (`MATCH_WEIGHT_AVAILABILITY = 25`, all other weighted factors false): the only way to reach `match_score_snapshot === 25` with `checklist.availability === true` is for the availability factor alone to score, which can only happen if `disponibilidad` was correctly translated. This is a genuine, single-factor isolation test, not one that would pass under a broader change.

## Independent re-run of the test suite

Ran `npm test -- --run` myself (not just trusting the developer's report): **23 files, 195 tests pass** (up from 194 before this fix — the one new BUG-001 regression test). Also re-ran `npx tsc --noEmit` and `npm run lint`: both clean. Did not re-run the developer's revert-then-restore regression exercise (three tests failing on revert, per their report) — independently confirming the fixed state passes cleanly, combined with tracing the weight arithmetic by hand above, is sufficient corroboration without repeating that exact exercise.

## Updated overall assessment

With this fix, all four items from the original REVISE's Required Changes, plus the two tracked items from the first re-review, are resolved:

1. Completeness tie-break — fixed and tested (first re-review).
2. RPC trust-boundary hardening — fixed and tested (first re-review).
3. Broken empty-state edit link — fixed (first re-review); residual dashboard-doesn't-list-active-necesidades gap remains, explicitly deferred to E2-04, not a defect in this fix.
4. Non-empty end-to-end publish test — present (first re-review).
5. `disponibilidad` snake_case/camelCase mismatch (BUG-001) — confirmed to have been live (not merely latent), now fixed and covered by a genuine isolating regression test (this pass).

No new issues were introduced by this fix: it is a narrowly-scoped, sibling-consistent translation fix plus a corrected test fixture and one new test, with lint/typecheck/full-suite all independently verified green.

## Final Verdict

**PASS**

## Remaining Required Changes

None. One non-blocking tracking item carries forward unchanged from the first re-review:

1. Track that `/familia`'s dashboard doesn't yet list active (`estado = 'activa'`) necesidades, so the "Volver a mis necesidades" empty-state link, while no longer broken, still can't get a family back to a specific published necesidad until E2-04's active-necesidad view/edit capability lands.
