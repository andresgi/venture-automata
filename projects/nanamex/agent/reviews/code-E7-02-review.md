# Code Review

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None. The server-side section RPC remains service-role-only, derives the user from the authenticated session, and the page does not render the editor when required profile reads fail.

## Important Issues

- The intended E7-02 working-tree change is not clean: unrelated deletion of `projects/test-invoice-generator` and untracked root `.claude/settings.json` remain. These must be excluded from the story change before merge.
- Page-level regression coverage for missing required rows and each direct-read error branch is absent. The fail-closed behavior is source-verified, but not protected by fault-injection tests.

## Minor Issues

- The edit-mode references rows remain a separate editable implementation rather than sharing the read-only row renderer. This is reasonable because edit controls differ, but it leaves two presentations to keep aligned.
- `save` closes over `data` while fields remain editable during the async request. A value changed during the request can be displayed as saved even though the earlier payload was persisted.
- Uploading a new public photo before saving identity can leave an orphaned object if the user cancels or the subsequent section save fails.

## Security Observations

- `app/ninera/perfil/page.tsx` checks all direct query errors, including the direct `zonas` options query, and requires both `profiles` and `perfil_ninera` rows before rendering the editor. Failed reads cannot silently become empty editable data.
- The section action re-authenticates, requires an active niñera profile, validates each section with Zod, and calls a service-role-only RPC using the authenticated user ID. The client cannot submit `verification_status`.
- The RPC locks the profile row, performs the identity transition server-side, reuses the latest non-null document path, and rolls back if no document exists. Non-identity sections do not alter verification status.
- Navigation links resolve to the existing `/ninera`, `/ninera/perfil`, and `/ninera/perfil/identificacion` routes. No sensitive logging or cross-user mutation was found.

## Test Coverage Observations

- Reported validation passes: full Vitest (66 files/469 tests), focused action tests (29 tests), lint, typecheck, secret scan, production build, and live database probe.
- Unit and database coverage exercises identity/non-identity edits, exact reason/path reuse, rollback, references persistence, and malformed payloads.
- The `ReferenceList` tests cover the standalone heading/disclaimer, optional contact, and row rendering. The `rowsOnly` API is correctly used by NIN-07 so the references view has one heading/disclaimer and no duplicated shared presentation.
- Missing-profile/read-error page rendering is not covered, so the fail-closed guarantee remains source-verified rather than regression-tested.

## Acceptance Criteria Assessment

- PASS — NIN-07 profile view/edit screen with section-level saves and verification-status badge/action.
- PASS — Verified identity edits of `nombre` or `foto_url` transition to `en_proceso`, append `re-revision_por_edicion_de_perfil`, and reuse the existing document path.
- PASS — Non-identity edits do not change verification status.
- PASS — Profile completeness/publication remains computed independently of verification status.
- PASS — Navigation exposes only existing routes.
- PASS — `ReferenceList` `rowsOnly` integration is type-safe, preserves the self-reported disclaimer exactly once, and does not regress the existing FAM-06 full-list presentation.
- PASS — Missing profile/profile detail, zones-options, and other direct-read errors are blocked before the editor renders (source-verified; not page-level regression-tested).
- UNCERTAIN — The implementation itself has no acceptance failure, but the intended E7-02 diff cannot be cleanly assessed until unrelated working-tree changes are separated.

## Required Changes

1. Exclude the unrelated `projects/test-invoice-generator` deletions and root `.claude/settings.json` from the E7-02 commit/PR.
2. Add page-level regression coverage for missing required rows and each `Promise.all` read-error branch, including the zones-options query.
