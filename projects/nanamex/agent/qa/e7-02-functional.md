# Functional QA

## Verdict

**PASS**

The stale reference-row edit-index defect is resolved. E7-02 profile editing, reference controls, identity re-review behavior, fail-closed reads, navigation, database behavior, and automated checks pass.

## Environment

- Repository: `projects/nanamex`; test date: 2026-09-04.
- Next.js 16.3.4, TypeScript, React 19.2.8, Vitest 4.1.11, local Supabase/Postgres.
- Web-only V1; mobile QA is not applicable per `config/CONSTRAINTS.md`.
- No production source was modified by QA. Authenticated browser click-through was unavailable; UI interaction verification below is source/state-transition based, supplemented by the live database probe and automated suite.

## Test Cases

### TC-001 — Reference add/edit/remove sequence after stale-index fix

- **Scenario:** With references A and B, edit B, remove A, then add C; edit and save the remaining rows.
- **Expected:** Removing A leaves B as the displayed row without stale edit state; adding C places only C into row-edit mode; subsequent edit/save/remove actions target the intended rows.
- **Actual:** `removeReference` now clears `rowEditing` after removal, so no old numeric index can be applied to the shifted B row or inherited by a newly added row. `addReference` assigns the new last index after the current reference list is updated. Per-row edit/save controls use the current index and update only that row.
- **Result:** PASS (source/state-transition verification)

### TC-002 — Reference section save

- **Scenario:** Add, edit, remove, and clear optional contact values, then save the references section.
- **Expected:** The complete reference set is submitted atomically and the saved state reflects exactly the submitted rows.
- **Actual:** Section validation accepts the reference payload; the action/RPC replacement path persisted the full set in the live E7-02 database probe. Successful save updates `savedData.referencias` and clears row editing.
- **Result:** PASS

### TC-003 — Reference section cancel

- **Scenario:** Make reference additions/edits/removals, then cancel instead of saving.
- **Expected:** The last saved reference set is restored and edit state closes.
- **Actual:** `restore("references")` restores `savedData.referencias`, exits section edit mode, clears row-edit state, and shows cancellation feedback.
- **Result:** PASS (source verification)

### TC-004 — Identity edit and badge-integrity re-review

- **Scenario:** Save unchanged identity; change verified `nombre` and/or `fotoUrl`; exercise missing-document rollback.
- **Expected:** Unchanged identity stays verified. A verified identity change becomes `en_proceso`, appends the exact re-review reason, and reuses the latest document path. Missing document rejects and rolls back.
- **Actual:** Focused action tests passed 29/29. The live E7-02 database probe passed unchanged identity, changed identity, exact reason/path reuse, and rollback cases.
- **Result:** PASS

### TC-005 — Non-identity/profile edits and publication independence

- **Scenario:** Save availability, work, about, and references changes, including malformed availability.
- **Expected:** Valid changes persist; malformed data is rejected atomically; non-identity edits do not change verification status; completeness/publication remains independently computed.
- **Actual:** Live database probe passed malformed availability rejection/rollback, valid availability persistence, and non-identity verification/publication preservation. Unit/action validation passed.
- **Result:** PASS

### TC-006 — Missing data and read-error fail-closed behavior

- **Scenario:** Profile page direct reads fail or required `profiles`/`perfil_ninera` rows are absent, including zones-options read failure.
- **Expected:** The editor must not render partial/empty editable data; the user is redirected to `/ninera`.
- **Actual:** `app/ninera/perfil/page.tsx` checks every Promise.all error (`profile`, `perfil`, `ninera_zonas`, `edades`, `referencias`, and `zonas`) and requires both profile rows before rendering. Source review confirms fail-closed behavior. Page-level fault injection is not available in the current automated suite.
- **Result:** PASS (source verification; regression coverage limitation noted)

### TC-007 — Authorization, invalid payloads, and navigation

- **Scenario:** Attempt section saves without a valid session/active niñera profile or with invalid section/payload data; use profile navigation.
- **Expected:** Server-side session/role/account checks reject unauthorized access; schemas reject malformed payloads; links resolve only to valid niñera routes.
- **Actual:** Action source and focused tests verify authentication, role/account checks, strict section schemas, and generic RPC failure handling. Production build includes `/ninera`, `/ninera/perfil`, and `/ninera/perfil/identificacion`; navigation links point to these routes.
- **Result:** PASS

## Bugs

None found in final targeted QA.

The prior BUG-001 (stale numeric row-edit indexes after reference removal) is resolved by clearing row-edit state in the removal path. This prevents shifted rows and newly added rows from inheriting stale edit state.

## Regression Results

- Full Vitest: **PASS — 66 files, 469 tests**.
- Lint: **PASS — `npm run lint`**.
- Typecheck: **PASS — `npm run typecheck`**.
- Secret scan: **PASS — `npm run check:secrets`**.
- Production build: **PASS — `npm run build`**; all three niñera routes present. Only the existing Supabase Node 20 deprecation warning was emitted.
- Live database regression: **PASS — `npm run test:db`**, including `test-e7-02-profile-edit.mjs`; all probes completed with exit 0.

## Recommendation

Approve E7-02 as functionally verified. Retain a browser-level authenticated smoke test for release when fixtures/tooling are available, especially for pointer-level add/edit/remove/save/cancel behavior and rendered read-error states.
