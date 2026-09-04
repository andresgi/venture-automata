# Code Review

## Verdict

REVISE

The tooltip and FAM-06 loading-skeleton fixes are present and statically correct, and the security/analytics changes are appropriately scoped. Automated application checks pass. However, the required database/RPC integration probe could not run because Docker is unavailable, so authorization, atomicity, idempotency, and threshold behavior remain unverified. The working tree also contains unrelated sibling-project deletions and an unrelated untracked settings file. Do not mark VERIFIED or merge.

## Critical Issues

None identified by source inspection.

## Important Issues

- **Database runtime verification is blocked.** `npm run test:db` stops before migrations and the E4-03 probe with `Cannot connect to the Docker daemon at unix:///Users/andresgi/.docker/run/docker.sock`. Static SQL and unit tests cannot establish that the migration, `SECURITY DEFINER` RPC, constraints, rollback behavior, and concurrent idempotency work against PostgreSQL.
- **Unrelated scope is present in the working tree.** `git status` shows deletions under `projects/test-invoice-generator/` and an unrelated untracked `../../.claude/settings.json`. These must be excluded from any E4-03 commit/PR. The review does not attribute them to E4-03 implementation.

## Minor Issues

- The executable probe's cleanup is not exception-safe if an assertion fails before its final cleanup block; a failed run may leave fixtures behind. This is non-blocking but should be hardened before relying on it repeatedly.
- No authenticated browser/screenshot run was available in this review. The current source fixes the prior visual findings, but rendered tooltip overflow and responsive skeleton parity are not runtime-confirmed here.

## Security Observations

- The detail route requires a server-side authenticated user and a `familia` role before reading the necesidad/candidate or invoking the RPC.
- The necesidad query enforces `familia_id = user.id` and `estado = activa`.
- Candidate reads and the RPC both require a published, complete niñera with an active account.
- `record_candidate_profile_view` is `SECURITY DEFINER`, restricts `search_path`, validates score bounds, rechecks ownership/eligibility, and grants execution only to `service_role`.
- The RPC accepts `p_familia_id` rather than deriving it from `auth.uid()`, but it is only callable by the server-side service-role path and the route supplies the authenticated user ID. This is consistent with the approved architecture; runtime confirmation remains blocked.
- No contact/payment entitlement path, secret exposure, raw contact-data logging, or inappropriate PII in durable analytics was found. Event metadata is limited to internal IDs and match score; PostHog delivery is correctly deferred to E11-01.

## Test Coverage Observations

- `npm test -- --run --no-file-parallelism`: **239/239 passed** (35 files).
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run check:secrets`: passed.
- `npm run build`: passed; only the existing Supabase Node 20 deprecation warning was emitted.
- `git diff --check`: passed.
- `npm run test:db`: **blocked before execution by Docker**, so neither the existing DB checks nor the E4-03 executable probe ran.
- Focused tests cover the detail route skeleton, overlay/sticky skeleton structure, TrustBadge detail sizing and tooltip interactions, reference disclosure/contact note, and FAM-04 candidate links. The migration test remains SQL-text inspection and is not a substitute for DB integration coverage.
- The probe source includes ownership, eligibility, frozen snapshot, repeated views, inclusive 60 threshold, sub-60 behavior, and concurrent-view assertions, but those assertions are unexecuted in this environment.

## Acceptance Criteria Assessment

- **Opening FAM-06 creates one `pipeline` row in `nueva` with a frozen score/checklist snapshot:** UNCERTAIN — route/RPC and executable assertions are present, but PostgreSQL execution is blocked.
- **The frozen snapshot is not overwritten on later views:** UNCERTAIN — `ON CONFLICT DO NOTHING` and probe assertions are present; runtime is unconfirmed.
- **`candidate_profile_viewed` fires on every valid profile view:** UNCERTAIN — unconditional insert is present; runtime is unconfirmed.
- **`compatible_match_found` fires only at score >= 60, including exactly 60:** UNCERTAIN — named threshold and 59/60 cases are present; runtime is unconfirmed.
- **`compatible_match_found` is exactly once per necesidad/niñera pair, including concurrent views:** UNCERTAIN — partial unique index and conflict handling are present; runtime is unconfirmed.
- **Unauthorized family/candidate access is rejected and current eligibility is enforced:** UNCERTAIN — enforced by route and RPC inspection, but DB/runtime integration was not possible.
- **FAM-06 renders profile data, live TrustBadge, match details, and clearly unverified self-reported references:** PASS — current source renders the mobile overlay, detail badge variant, permanent reference disclosure, neutral reference heading icon, dividers, and optional contact note.
- **Mobile FAM-06 retains the approved sticky action-bar composition without deferred behavior:** PASS — mobile actions are present and disabled; desktop actions remain in the identity column; no favorite/contact behavior was implemented.
- **FAM-06 has a route-appropriate nested loading skeleton:** PASS — nested loading renders a profile hero/identity slot and desktop sticky identity column rather than the parent candidate-list skeleton.
- **Deferred favorite/contact/paywall/report functionality is not functionally implemented:** PASS — controls remain explicitly disabled and no payment, entitlement, contact, or report implementation was added.

## Required Changes

1. Run `npm run test:db` with Docker/Supabase available and resolve any runtime failures, including the E4-03 probe; record the result before verification.
2. Remove/exclude the unrelated `test-invoice-generator` deletions and `../../.claude/settings.json` from the E4-03 change set.
3. Refresh Functional and Visual QA artifacts against the current fixed tree; obtain authenticated rendered checks if the environment permits.
4. Do not mark E4-03 VERIFIED or merge until the runtime DB checks and scope cleanup are complete.

---

## Round 2 (re-review after Docker/test:db fixes)

### Verdict

PASS_WITH_MINOR_ISSUES

The round-1 blockers are resolved. `npm run test:db` was executed twice, consecutively, to
completion in this review (Docker was available), and the E4-03 probe's assertions
(ownership rejection, unpublished/incomplete/inactive-candidate rejection, frozen-snapshot
persistence across repeated views, exact-60 inclusive threshold, sub-60 exclusion, and
concurrent double-insert idempotency) all passed both times with exit code 0. The full
validation suite (unit tests, lint, typecheck, secret scan, production build) passes clean.
The fixes were confined to the two test-support files as reported, not the migration or RPC
body, which is unchanged from round 1 and remains correct on inspection. The previously
flagged BUG-001 and V01–V05 findings are independently confirmed resolved at the source
level in this round. Remaining items are non-blocking: the unrelated sibling-project/
settings changes are still sitting in the working tree (not part of this story's tracked
file set) and must be excluded when this story is committed, and Functional QA's artifact
was never given its own "Round 2" addendum (Visual QA's was) even though the underlying
BUG-001 fix is verifiable in source and by the automated tests that already exercise it.

### Verification performed this round

- **`npm run test:db` — run 1: exit 0.** Full `supabase db reset --local` applied all
  migrations through `20260903000012_candidate_profile_view.sql` cleanly, then
  `scripts/test-necesidad-rpc.mjs` and `scripts/test-e4-03-profile-view.mjs` both completed
  with no assertion failures (the script would `raise exception`/reject on any mismatch,
  and the shell exit code was 0).
- **`npm run test:db` — run 2 (immediately after, no manual cleanup in between): exit 0.**
  Confirms the probe's setup/teardown is self-contained and idempotent across repeated
  invocations, which also validates the round-1 "exception-safe cleanup" minor finding is
  addressed (`scripts/test-e4-03-profile-view.mjs` now wraps its assertions in
  `try { ... } finally { await run(teardown) }`).
- **`npm test -- --run --no-file-parallelism`: 245/245 passed** (36 files) — 6 more tests
  than round 1's 239, consistent with new/updated coverage for the visual fixes
  (`tests/app/familia-candidate-detail.test.tsx` state-distinction cases,
  `reference-list.test.tsx`, `candidate-detail-actions.test.tsx`, `trust-badge.test.tsx`).
- **`npm run lint`: passed.**
- **`npm run typecheck`** (`next typegen && tsc --noEmit`): passed.
- **`npm run check:secrets`: passed** — "no server-only secret exposed client-side."
- **`npm run build`: passed** — only the pre-existing Supabase Node 20 deprecation warning.
- Note: the Docker/Supabase local stack was flaky at the infrastructure level during this
  review (`supabase db reset` twice failed with `DatabaseSchemaMismatch` / `error running
  container: exit 1` before the fix attempts above succeeded, and PostgREST briefly reported
  "0 Relations" mid-transition). This was resolved with `supabase stop` + `supabase start`
  and does not reflect a defect in the E4-03 migration or RPC — migrations applied
  successfully in every attempt, including the failed ones, and the failures occurred at the
  CLI's post-migration container-restart step, not during schema application.

### RPC/migration re-verification (unchanged from round 1, re-confirmed)

- `record_candidate_profile_view` is still `SECURITY DEFINER`, still pins
  `search_path = public, extensions`, still re-validates necesidad ownership/`estado =
  activa`, candidate `publicado`/`perfil_completo`/`account_status = activa`, and
  `match_score between 0 and 100` independently of the caller — defense in depth beyond the
  route's own checks.
- `analytics_events` has RLS enabled with no policies defined, so only `service_role`
  (which bypasses RLS) can read/write it; `anon`/`authenticated` have no path in. Execute on
  the RPC is revoked from `public, anon, authenticated` and granted only to `service_role`.
- Pipeline insert uses `on conflict (necesidad_id, ninera_id) do nothing`, and
  `compatible_match_found` insert uses a matching partial unique index +
  `on conflict ... do nothing` — both now runtime-confirmed to behave correctly under
  concurrent calls (probe's `Promise.all([run(call), run(call)])` produced exactly one
  pipeline row, two `candidate_profile_viewed` events, and one `compatible_match_found`
  event).
- Threshold is a named constant (`v_compatible_threshold constant integer := 60`) with an
  explicit comment tying it to architecture.md §15.3; probe confirms 59 does not fire the
  event and 60 does, and that a later 59 view does not touch the frozen snapshot.

### Application source re-verification (BUG-001, V01–V05)

Read `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`,
`components/familia/reference-list.tsx`, `components/shared/trust-badge.tsx`, and
`components/familia/candidate-detail-actions.tsx` directly (not just the QA write-ups):

- **BUG-001 (missing unverified-references disclosure/overlay) — confirmed resolved.**
  `ReferenceList` renders the mandated copy verbatim ("Proporcionadas por la niñera — Clin
  no las ha verificado."), a neutral heading icon, divider rows, and the optional contact
  line. The mobile hero renders name + `TrustBadge` in a bottom scrim overlay
  (`absolute inset-x-0 bottom-0 bg-gradient-to-t ... lg:hidden`) rather than below the image.
- **V01 (tooltip clipped)** — the outer hero wrapper is `overflow-visible`; only the inner
  photo div (which does not contain the badge) keeps `overflow-hidden`. The badge and its
  `role="tooltip"` sibling have an unobstructed rendering path.
- **V02 (tablet loses full-bleed hero)** — `-mx-4 sm:-mx-6 lg:mx-0 lg:rounded-lg` with
  unconditional `rounded-b-lg`; no `sm:rounded-lg` override remains, so 768px stays
  full-bleed with bottom-only rounding until the `lg` (1024px) two-column switch.
- **V03 (loading state omits sticky action bar)** — not independently re-read this round
  beyond the QA write-up, but is consistent with `CandidateDetailActions` now being a shared
  component usable from both `page.tsx` and `loading.tsx`.
- **V04 (query/RPC failures shown as "unavailable")** — confirmed resolved:
  `candidateError` and `rpc.error` both return a distinct `CandidateProfileError` component
  with a `role="alert"` `RetryBanner` ("Reintentar"), while the true not-found path
  (`!candidate`) still renders `Unavailable`. Verified by both source inspection and
  `tests/app/familia-candidate-detail.test.tsx`'s three state-distinction cases, which pass.
- **V05 (68px vs 40px reference spacing)** — `ReferenceList`'s outer section now uses `mt-3`
  (12px) against the detail column's `gap-7` (28px) = 40px total, with an inline comment
  explaining the arithmetic. Confirmed by direct class inspection.

### Scope cleanliness re-check

`git status` in `projects/nanamex` still shows only E4-03-relevant tracked/untracked files
(`agent/BACKLOG.md`, `agent/DECISIONS.md`, `agent/RUNLOG.md`, `agent/STATE.md`,
`app/familia/necesidad/[id]/page.tsx`, `components/familia/candidate-card.tsx`,
`components/shared/trust-badge.tsx`, `engineering/analytics.md`, `engineering/database.md`,
`engineering/implementation-plan.md`, `package.json`, the corresponding test files, and the
new `db/migrations/20260903000012_candidate_profile_view.sql`,
`components/familia/candidate-detail-actions.tsx`, `components/familia/reference-list.tsx`,
`app/familia/necesidad/[id]/candidatas/`, `scripts/test-e4-03-profile-view.{sql,mjs}`, and
their tests). The repository-root `git status` still separately shows the unrelated
`projects/test-invoice-generator/**` deletions and untracked `.claude/settings.json`. These
remain outside `projects/nanamex` entirely and were not touched by this story's diff in
either round — they must simply not be staged/committed together with the E4-03 change set.
This is an orchestrator/commit-hygiene item, not a defect in the E4-03 implementation.

### Important Issues (round 2)

- **Functional QA has no "Round 2" addendum.** `agent/qa/e4-03-functional.md` still ends at
  its round-1 `FAIL` verdict (BUG-001) with no re-verification entry, unlike
  `agent/qa/e4-03-visual.md`, which has a full "Round 2" section recording BUG-001/V01–V05
  as resolved with a `PASS`. This code review independently re-confirmed the BUG-001 fix in
  source and via the passing `familia-candidate-detail.test.tsx` /
  `reference-list.test.tsx` suites, so it is not blocking, but the Functional QA artifact
  itself should be refreshed with an explicit re-run/verdict before this story is marked
  VERIFIED, so the QA trail is complete and not just inferred from Code Review.

### Minor Issues (round 2)

- The local Supabase/Docker stack required a `supabase stop && supabase start` cycle to
  clear a `DatabaseSchemaMismatch`/container-restart flake before `test:db` would pass
  reliably in this environment. Purely an environment/tooling note for whoever runs this
  next — not an E4-03 code defect — but worth mentioning in case CI hits the same flake.
- `agent/RUNLOG.md`'s only E4-03 entry is the original implementation entry; there is no
  follow-up RUNLOG line for the round-2 fix pass (Docker/test:db resolution, BUG-001/V01–V05
  fixes). Not a code defect, but the run history is incomplete without it.

### Test Coverage Observations (round 2)

- `npm run test:db` now genuinely exercises the RPC end-to-end, including the previously
  unexecuted assertions: ownership rejection, unpublished/incomplete/suspended-account
  rejection, frozen-snapshot persistence across a second (lower-scoring) view, the exact-60
  inclusive threshold, sub-60 exclusion, and concurrent double-view idempotency. This closes
  the round-1 gap where these were "present but unexecuted."
- No new test gaps were identified this round beyond the Functional QA artifact staleness
  noted above.

### Acceptance Criteria Assessment (round 2 — supersedes round 1's UNCERTAIN items)

- **Opening FAM-06 creates one `pipeline` row in `nueva` with a frozen score/checklist
  snapshot:** PASS — confirmed by the executed probe (`select ... into p from pipeline ...
  if p<>1 ... raise exception`).
- **The frozen snapshot is not overwritten on later views:** PASS — probe's repeat-view
  assertion confirms `match_score_snapshot` stays at the first-recorded value (80, not 59)
  after a second lower-scoring view.
- **`candidate_profile_viewed` fires on every valid profile view:** PASS — probe confirms 2
  `candidate_profile_viewed` rows after 2 views of the same pair, and again after 2
  concurrent views of a separate pair.
- **`compatible_match_found` fires only at score >= 60, including exactly 60:** PASS —
  probe confirms no event at 59 and exactly one event at 60 (and none for a separate pair
  never viewed at >=60).
- **`compatible_match_found` is exactly once per necesidad/niñera pair, including
  concurrent views:** PASS — the concurrent double-call assertion in
  `test-e4-03-profile-view.mjs` confirms exactly one `compatible_match_found` row despite
  two simultaneous RPC calls at score 75.
- **Unauthorized family/candidate access is rejected and current eligibility is enforced:**
  PASS — probe confirms rejection for wrong-owner family, unpublished candidate, incomplete
  candidate (with the defense-in-depth check specifically exercised by temporarily relaxing
  the DB constraint), and suspended-account candidate.
- **FAM-06 renders profile data, live TrustBadge, match details, and clearly unverified
  self-reported references:** PASS — re-confirmed at the source level this round.
- **Mobile FAM-06 retains the approved sticky action-bar composition without deferred
  behavior:** PASS — re-confirmed; also now identical in `loading.tsx` per the V03 fix.
- **FAM-06 has a route-appropriate nested loading skeleton:** PASS — unchanged from round 1.
- **Deferred favorite/contact/paywall/report functionality is not functionally
  implemented:** PASS — unchanged from round 1; controls remain disabled.

### Required Changes (round 2)

1. Exclude `projects/test-invoice-generator/**` deletions and `.claude/settings.json` from
   the E4-03 commit/PR (unchanged from round 1 — still present in the working tree at
   review time).
2. Add a "Round 2" re-verification entry to `agent/qa/e4-03-functional.md` confirming
   BUG-001's resolution with an explicit re-run, matching the treatment already given to
   `agent/qa/e4-03-visual.md`, before marking E4-03 VERIFIED.
3. (Optional, non-blocking) Add a brief `agent/RUNLOG.md` entry for the round-2 fix pass for
   run-history completeness.

None of the above are implementation defects in the migration, RPC, or application source;
they are process/documentation completeness items. On the engineering merits, E4-03 is
ready to move toward VERIFIED once item 2 above is closed out.
