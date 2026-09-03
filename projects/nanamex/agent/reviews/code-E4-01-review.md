# Code Review

## Verdict

REVISE

## Critical Issues

None.

## Important Issues

- **[Important] Empty-state semantics are still wrong for an all-stale pipeline** (`app/familia/necesidad/[id]/page.tsx:245-265`). The live query now correctly excludes unpublished, incomplete, or inactive candidates, and missing rows are no longer rendered as fake cards. However, when every pipeline row is filtered out, the code sets `liveStatusError = true` and shows a retry/error banner. This is a normal zero-current-match result, not a failed read, and FAM-04 specifies the calm empty state for zero matches. A stale/deactivated candidate should not force the family to retry indefinitely.
- **[Important] The required empty-state recovery CTA remains unresolved** (`app/familia/necesidad/[id]/page.tsx:143-158`). It still links to `/familia` as “Volver a mis necesidades”, while the UX/UI requirement calls for “Editar necesidad” to the FAM-03 review step. The comments document the limitation but do not satisfy the acceptance criterion or record an approved exception.
- **[Important] Required ranking and eligibility regression coverage is still missing** (`tests/app/familia-necesidad-id.test.tsx:160-220`). The implementation now carries `perfil_completo`, `created_at`, and the deterministic ID comparator, and the live query contains the current eligibility predicates. Tests only prove score ordering and the all-missing case; they do not prove completeness/created_at/id tie-break ordering, mixed stale/live rows, or that the query builder receives the published/complete/active filters. The mock is specifically shaped to accept those calls without asserting them.

## Minor Issues

- The comparator falls back from `perfil_ninera.created_at` to `profiles.created_at` (`app/familia/necesidad/[id]/page.tsx:182-187`), although the architecture identifies the niñera profile timestamp as authoritative. This is harmless if the schema invariant holds, but should either be justified or covered for missing timestamps.
- Disabled “Guardar favorita” and “Ver perfil” affordances remain intentional later-epic placeholders (`components/familia/candidate-card.tsx:75-92`); keep them tracked as deferred scope.

## Security Observations

- PASS: necesidad access remains scoped by authenticated user and `familia_id` (`app/familia/necesidad/[id]/page.tsx:199-206`).
- PASS: current candidate query restricts discoverability with `publicado`, `perfil_completo`, and active owning profile status (`app/familia/necesidad/[id]/page.tsx:237-243`).
- PASS: live verification status is displayed but excluded from ranking inputs (`app/familia/necesidad/[id]/page.tsx:176-187`).
- No new security regression observed. Service-role defense-in-depth remains dependent on the server-side ownership predicate and has no integration test here.

## Test Coverage Observations

- Full suite passed: **31 files, 225 tests**.
- `npm run lint` passed.
- `npm run typecheck` passed.
- Prior missing runtime protections are partly addressed, but the new ranking tie-break fields and current-eligibility query shape are not meaningfully tested. The all-missing test currently expects the error state, which conflicts with FAM-04’s zero-match semantics if filtering is working normally.

## Acceptance Criteria Assessment

- **All FAM-04 default/empty/loading/error states:** **FAIL** — default/loading/error exist, but all stale/ineligible candidates produce error rather than the specified empty state; CTA also does not target edit/FAM-03.
- **Match Score numeral and up to 3 checklist lines per card:** **PASS**.
- **TrustBadge with current live verification status and no ranking influence:** **PASS**.
- **Candidate card content (photo/avatar, name, badge, score/checklist, affordances):** **PASS**.
- **Ranking/snapshots:** **PASS** in the implementation — frozen score/checklist are used and the full comparator is present; **UNCERTAIN** in confidence because tie-break behavior lacks tests.
- **Family data authorization:** **PASS** for the application ownership check; **UNCERTAIN** for defense-in-depth because the service-role/RLS setup is not integration-tested.
- **Scope boundaries:** **PASS** for filters/favorites/profile detail being deferred; **FAIL** for the explicitly required empty-state edit recovery path.

## Required Changes

1. Treat zero eligible live candidates after current discoverability filtering as the documented calm empty state; reserve the retry banner for an actual live query error.
2. Implement the FAM-03 edit CTA, or obtain and record an explicit approved exception to the requirement.
3. Add focused tests for score → completeness → created_at → ID ordering, mixed and all stale/ineligible live rows, and query predicate construction; update the all-stale expectation to the correct empty/error behavior.
