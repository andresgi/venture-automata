# Code Review — E1-03 FAM-01 onboarding perfil familiar

## Verdict

PASS_WITH_MINOR_ISSUES

## Critical Issues

None found.

## Important Issues

None found. The three judgment calls flagged for scrutiny are all sound:

1. **`nombre` as confirmation of `profiles.nombre`** (`actions/perfil-familiar.ts:31-48`,
   `lib/familia/validation.ts:9-13`) — reasonable given three independent design docs
   (journeys.md, screen-inventory.md, UI-SPEC.md) list "nombre" as a FAM-01 field while
   `database.md` §2's `perfil_familiar` has no such column. Treating it as an editable
   confirmation of the existing `profiles.nombre` (pre-filled, written back only on change,
   `actions/perfil-familiar.ts:104-113`) is a defensible interpretation, not scope invention.
   The write uses `createServiceRoleClient()` (`actions/perfil-familiar.ts:76`), not a
   client-session write — correct per architecture.md §3. No shadow/duplicate nombre field
   is introduced. This was a reasonable call to make locally rather than escalate, since it
   doesn't add a column, doesn't conflict with any stated non-goal, and is fully reversible;
   still worth a one-line confirmation in agent/DECISIONS.md given it's a documented
   deviation from the DB doc's literal minimum (not found there as of this review).

2. **FAM-01 completion gate on `/familia`** (`app/familia/page.tsx:20-37`) — correctly
   implemented. No redirect loop: `/familia/perfil` (`app/familia/perfil/page.tsx:27-35`)
   only ever redirects to `/login` (never back to `/familia`), so the two pages can't
   ping-pong. The gate only runs `if (user)` (`app/familia/page.tsx:26`), deferring to the
   existing `proxy.ts` role/session gate for the unauthenticated case, matching the stated
   design. Confirmed via `proxy.ts:60-62`'s matcher that `/familia/perfil` is covered by the
   same role gate as `/familia`, so a niñera session can't reach either route regardless of
   this page's own checks. `tests/app/familia.test.tsx` is a new file (verified: does not
   exist on `main`), not a pre-existing test whose assertions were altered — no evidence of
   deleted/weakened assertions.

3. **Server-side `zona_id` re-validation** (`actions/perfil-familiar.ts:94-102`) — genuinely
   re-queries the real `zonas` table by id and rejects if no row is found, independent of the
   zod UUID-shape check (`lib/familia/validation.ts:22`). Confirmed by
   `tests/actions/perfil-familiar.test.ts:150-169` (zona id well-formed but absent from table
   → rejected, upsert never called). This is real "not free text" enforcement, not just a
   client-side claim.

Role check (`actions/perfil-familiar.ts:84`: `profile.role !== "familia"`) exists and is
correct, and is independently exercised by
`tests/actions/perfil-familiar.test.ts:130-148`.

## Minor Issues

- `actions/perfil-familiar.ts:123-126`: redirects to `/familia` (the dashboard placeholder)
  instead of the spec's stated FAM-01 target, FAM-03 ("Crear necesidad wizard," per
  `design/journeys.md` J-FAM-1 step 5 and `design/UI-SPEC.md`'s "primary 'Continuar' →
  redirects to FAM-03"). This is explicitly called out in a code comment as a placeholder
  because FAM-03 doesn't exist yet (Epic 2). Reasonable interim choice, but flag it as a
  tracked follow-up (e.g. a BACKLOG note on E2-01) so the redirect target is actually updated
  once FAM-03 ships — a comment alone is easy to forget.
- `components/familia/zona-autocomplete.tsx`: no client-side `required` marker or disabled
  state tied to whether a zona is selected — reliance is entirely on server-side field-error
  feedback after a full round trip. Matches FAM-03's stated "no error-shouting until the user
  tries to advance" pattern and is not a spec violation, but a slightly snappier UX would
  disable/hint before submit. Not blocking.
- No test exercises the case where `profiles` select itself errors/returns null for a valid
  session (`actions/perfil-familiar.ts:78-86`, the `!profile` branch) — low risk, trivial
  branch, but a one-line gap in an otherwise thorough action test suite.

## Security Observations

- Defense-in-depth role check confirmed present and correct in the server action, independent
  of route-group/proxy gating (`actions/perfil-familiar.ts:50-52,84`).
- Both database writes (`profiles.nombre` update, `perfil_familiar` upsert) go through
  `createServiceRoleClient()` server-side; no direct client/browser Supabase writes are used
  anywhere in this diff. Consistent with architecture.md §3's stated authorization model
  (Next.js server code as the primary boundary, RLS as defense-in-depth only).
  `lib/zonas/queries.ts` is similarly server-only (`import "server-only"` at line 1) and
  correctly does not expose the service-role client to client components — only the
  read-only `ZonaOption[]` projection is passed as props.
  No PII is logged; error paths return only the generic message constant, no raw DB error
  detail is leaked to the client.
- `zona_id` is re-validated against the real table server-side, closing the obvious
  "clientsupplies-any-UUID" bypass.

## Test Coverage Observations

All five new test files were read in full and are substantive, not superficial:

- `tests/lib/familia/validation.test.ts` — straightforward but complete schema-boundary
  coverage (empty, whitespace-only, non-UUID, undefined zonaId).
- `tests/actions/perfil-familiar.test.ts` — exercises every branch: bad input short-circuits
  before touching session/DB, no session, wrong role, zona not found, nombre changed vs.
  unchanged (asserting `update` is/isn't called), and upsert failure — all via a real
  fluent-query-builder test double rather than trivial mocks, with assertions on exact
  call arguments (e.g. `toHaveBeenCalledWith({ nombre: "Ana Nueva" })`,
  `{ onConflict: "profile_id" }`).
- `tests/components/familia/zona-autocomplete.test.tsx` — genuinely exercises typing,
  filtering (case-insensitive, colonia vs. municipio disambiguation), selecting via
  `fireEvent.click`, verifying the hidden input only ever holds a real id (never raw free
  text), and that editing the text after a selection clears the previously selected id. This
  is real Testing Library interaction coverage, not shallow rendering assertions.
- `tests/app/familia-perfil.test.tsx` and `tests/app/familia.test.tsx` — both render the real
  Server Component end-to-end with only the Supabase boundary mocked, covering the no-session
  redirect, the FAM-01 gate redirect, pre-fill behavior (name and zona), and the no-session
  case not attempting the gate check.

Ran the five new test files locally: 26/26 pass.

## Acceptance Criteria Assessment

Per `engineering/implementation-plan.md` E1-03: "nombre + zona (autocomplete against
`zonas`) required to proceed."

- **Nombre required to proceed** — PASS. Client-side `required` attribute plus server-side
  zod `min(1)` check (`lib/familia/validation.ts:21`), verified by
  `tests/lib/familia/validation.test.ts` and `tests/actions/perfil-familiar.test.ts:97-106`.
- **Zona required to proceed, enforced as an actual autocomplete against `zonas` (not free
  text)** — PASS. Client control only ever wires a real zona id into the submitted hidden
  field; server re-validates the id against the live `zonas` table
  (`actions/perfil-familiar.ts:94-102`). Verified by component tests (hidden input stays
  empty on free-text-only input) and action tests (id-not-found rejected).
- **Standard form validation tests** — PASS. Schema, action, and component levels are all
  covered with meaningful assertions, not just smoke tests.
- **Dependencies satisfied (E1-02, E0-03 zonas seeded)** — PASS (per repo state: E1-02
  merged to `main` before this branch, `zonas` seed referenced and consumed via
  `lib/zonas/queries.ts`).

## Required Changes

None required before merge. Optional follow-ups (non-blocking):

1. Record the `profiles.nombre`-as-FAM-01-field interpretation as a one-line decision in
   `agent/DECISIONS.md` for traceability, given it's a genuine (if reasonable) interpretation
   of ambiguous cross-document specs rather than a literal schema match.
2. Add a tracked backlog note (e.g. on E2-01, which builds FAM-03) to update
   `actions/perfil-familiar.ts:123-126`'s redirect target from `/familia` to FAM-03 once that
   route exists, so the placeholder doesn't silently become permanent.
