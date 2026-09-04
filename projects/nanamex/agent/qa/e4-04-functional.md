# Functional QA — E4-04 (FAM-07 "Favoritas")

## Verdict

**REVISION_REQUIRED**

The core favoriting behavior (RPC semantics, frozen-snapshot integrity, authorization,
eligibility, and the FAM-07 listing/grouping/empty-state) is implemented correctly and is
independently verified below. However, I concur with Visual QA's V01 finding
(`agent/qa/e4-04-visual.md`): `FavoriteToggle`'s failure path has no feedback visible to a
sighted user, which is not just a visual-polish gap but a functional "failure behavior"
defect — a family who taps the heart, sees it fill, then watches it silently revert on a
failed request gets no indication anything went wrong. I'm logging this independently as
**BUG-001** (see below) and it should block VERIFIED status until fixed, consistent with
Visual QA's REVISION_REQUIRED.

## Environment

- Branch: `nanamex/e4-03-fam06-candidate-detail` (checked out, with E4-04's changes present
  in the working tree, matching the state Visual QA reviewed).
- Local Supabase stack (`supabase_db_nanamex` etc.) already running; required one
  `supabase stop && supabase start` cycle mid-session after a transient
  `DatabaseSchemaMismatch`/duplicate-migration-key error from `supabase db reset` (Docker
  container health-check flakiness unrelated to this story's SQL — confirmed by a clean
  second run with exit code 0 immediately after the restart).
- Node test runner: Vitest v4.1.11. `psql` probe against `127.0.0.1:55322`.

## Test Cases

### 1. Favoriting a never-before-seen candidate creates one frozen pipeline row
- **Expected:** New `pipeline` row, `es_favorita = true`, snapshot fields set to the
  submitted score/checklist.
- **Actual:** Verified via `scripts/test-e4-04-favorites.sql` (lines 22-27) against the real
  local Postgres: `set_candidate_favorite(...)` with no prior row inserts one row with
  `es_favorita = true`, `match_score_snapshot = 80`. Assertion passed.
- **Result:** PASS

### 2. Favoriting a candidate with an existing pipeline row only flips `es_favorita`
- **Expected:** No mutation of `match_score_snapshot`/`match_checklist_snapshot` on repeat or
  pre-existing rows.
- **Actual:** Two sub-cases verified against real Postgres:
  - Repeat favorite call with a different score (10 vs. original 80) on the same row: script
    lines 29-34 assert the snapshot is still 80 (`on conflict (necesidad_id, ninera_id) do
    update set es_favorita = true, updated_at = now()` in the migration — snapshot columns
    are absent from the `do update set` clause, so Postgres cannot touch them).
  - A row pre-existing from a simulated prior profile view (`match_score_snapshot = 55`,
    `es_favorita = false`) favorited with a different score (99): script lines 51-59 assert
    the snapshot (`55`, `{"availability":true}`) is unchanged and only `es_favorita` flips to
    `true`.
- **Result:** PASS

### 3. Unfavoriting flips the flag without deleting the row
- **Expected:** `es_favorita = false`, row persists (count unchanged), snapshot untouched.
- **Actual:** Script lines 36-42: after unfavoriting, `es_favorita = false`,
  `match_score_snapshot` still 80, row count still 1 for that `(necesidad_id, ninera_id)`
  pair.
- **Result:** PASS

### 4. Unfavoriting a candidate with no existing pipeline row is a safe no-op
- **Expected:** No row created.
- **Actual:** Script lines 44-49: calling unfavorite on a pair with zero prior pipeline
  activity leaves the row count at 0 for that necesidad — confirmed by direct row count
  assertion. Matches the migration's `update ... where ...` (no `insert`) for the `else`
  branch (`db/migrations/20260903000013_candidate_favorites.sql` lines 44-49).
- **Result:** PASS

### 5. Another family cannot favorite/unfavorite on a necesidad they don't own
- **Expected:** Rejected server-side.
- **Actual:** Script lines 14-15: Familia B calling `set_candidate_favorite` against Familia
  A's necesidad (favorite direction) raises an exception, asserted via the `failed` flag
  pattern. The ownership/`estado = 'activa'` check in the RPC (migration lines 27-30) runs
  **unconditionally before branching on `p_favorite`**, so the same rejection structurally
  applies to the unfavorite direction too — verified by code inspection since the check
  precedes the `if p_favorite then ... else ...` branch entirely. The SQL probe itself only
  exercises the favorite direction for this case; I did not find a companion assertion for
  unauthorized *unfavorite* in the script, but the code path guarantees it (noting as a test
  script coverage gap, not a functional bug).
  Also verified `actions/favorites.ts` never trusts a client-supplied family id: it always
  passes `p_familia_id: user.id` from the authenticated session (`tests/actions/
  favorites.test.ts` "calls set_candidate_favorite with the authenticated family id, not a
  client-supplied one" — part of the passing suite).
- **Result:** PASS

### 6. Favoriting an unpublished/incomplete/inactive candidate is rejected
- **Expected:** Same eligibility bar as E4-03's `record_candidate_profile_view`
  (`publicado = true`, `perfil_completo = true`, `account_status = 'activa'`).
- **Actual:** Script lines 17-20: setting `publicado = false` on the candidate and retrying
  the favorite call raises an exception (`candidate_not_available`), asserted via the same
  `failed` flag pattern; candidate is restored to `publicado = true` afterward. Migration
  code (lines 33-38) checks exactly the three fields named in the story description.
- **Result:** PASS

### 7. FAM-07 lists favorites grouped by necesidad, reuses FAM-04's card, correct empty state
- **Expected:** Per UI-SPEC FAM-07 — grouped display, same card component, empty-state copy
  "Aún no has guardado ninguna niñera" + CTA to first active necesidad's FAM-04.
- **Actual:** Confirmed by reading `app/familia/favoritas/page.tsx` and its test suite
  (`tests/app/familia-favoritas.test.tsx`, part of the passing suite):
  - Groups by necesidad (`buildGroups`), filters to `es_favorita === true` rows only, drops
    a favorite whose candidate is no longer live-eligible (published/complete/active) —
    exercised by the "drops a favorite that is no longer a currently eligible candidate"
    test, which correctly falls through to the empty state.
  - Uses the exact same `CandidateCard` component as FAM-04 (`import { CandidateCard } from
    "@/components/familia/candidate-card"`), same grid classes as the FAM-04 listing.
  - Empty-state headline matches the spec's copy verbatim; CTA links to
    `/familia/necesidad/${firstActive.id}` when an active necesidad exists, or
    `/familia` ("Ver mis necesidades") when the family has none at all — a sensible fallback
    not explicitly specified but consistent with the spec's intent (there is no FAM-04 to
    link to if no necesidad exists).
  - A nav entry point exists from FAM-02 (`app/familia/page.tsx`, confirmed present in the
    diff and by Visual QA's review).
  - Error state: a Supabase read failure on `necesidades` or `perfil_ninera` renders a
    `RetryBanner`, not a crash — exercised by the "renders a retry banner when reading
    necesidades fails" test.
- **Result:** PASS (see V02 in Visual QA's report for a minor, non-blocking copy-consistency
  note on the CTA label, which I did not re-litigate here as it's advisory-only).

### 8. Favoriting/unfavoriting never triggers or requires any entitlement/paywall check
- **Expected:** Per UX-spec Decision 4 — free and unlimited, no E5 (contact/checkout) or E9
  (report) behavior leakage.
- **Actual:** Grepped `actions/favorites.ts`, `components/familia/favorite-toggle.tsx`,
  `app/familia/favoritas/page.tsx`, and the new migration for `entitlement`/`paywall` —
  the only matches are code comments explicitly documenting the *absence* of such a check.
  `set_candidate_favorite` (migration) contains no entitlement lookup. `CandidateDetailActions`
  (FAM-06) keeps "Contactar" as a `disabled` placeholder button in both desktop and mobile
  layouts — no paywall trigger wired to it in this story. No report-flow (E9) code appears in
  any of E4-04's files.
- **Result:** PASS

### Failure behavior — FavoriteToggle failure feedback (functional read on Visual QA's V01)
- **Expected:** Per the "Failure behavior" QA category and UI-SYSTEM.md §5.6 (which
  explicitly names "favorited" as a toast-pattern example), a failed favorite/unfavorite
  request should give the user visible, non-screen-reader-only feedback, since the UI has
  already optimistically changed the icon state and then silently reverts it.
- **Actual:** `components/familia/favorite-toggle.tsx` line 60:
  `<span role="alert" className="sr-only">{error}</span>` — the only failure feedback is an
  `sr-only` element. Confirmed via the passing unit test
  ("reverts the optimistic toggle when the server action fails",
  `tests/components/familia/favorite-toggle.test.tsx` lines 37-43): the test asserts
  `screen.getByRole("alert")` has the error text, but does not (and structurally cannot,
  given the markup) assert anything is visibly rendered — `getByRole` finds `sr-only`
  elements too. Grepped the repo for `toast`/`sonner` usage in `components/`/`app/`: no
  matches outside test files, confirming no toast mechanism exists anywhere in the app yet.
  A sighted user sees the heart fill on tap, then un-fill moments later with zero visible
  explanation — indistinguishable from a flaky/broken control.
- **Result:** FAIL — logged as BUG-001. I independently reproduced and confirm Visual QA's
  V01 assessment; this is not merely cosmetic, it's a genuine gap in the failure-behavior
  requirement this QA pass is specifically scoped to check.

## Bugs

### BUG-001 — No visible (non-screen-reader) feedback when favorite/unfavorite fails
- **Severity:** Major
- **Reproduction:**
  1. Render `FavoriteToggle` (or exercise FAM-04/FAM-06/FAM-07 in the running app) with a
     `toggleFavoriteAction` call that resolves `{ ok: false, isFavorite: <prior>, message:
     "..." }` (e.g. simulate a network failure, or force the RPC to error — the app already
     covers this in `tests/components/familia/favorite-toggle.test.tsx` "reverts the
     optimistic toggle when the server action fails").
  2. Observe the heart icon fill on click (optimistic), then silently un-fill once the
     failed response resolves.
  3. Inspect the DOM: the only error text present is inside `<span role="alert"
     className="sr-only">`, invisible to sighted users; no toast, banner, or inline visible
     text is rendered anywhere near the control.
- **Expected:** design/UI-SYSTEM.md §5.6 names "favorited" explicitly as a toast use case
  (bottom-anchored/bottom-left, icon + message, `elevation-2`, auto-dismiss 4s). At minimum,
  a failed favorite/unfavorite attempt should surface a visible error (toast or inline
  danger text) so the user understands the heart reverted because of a failure, not because
  of a UI glitch.
- **Actual:** Only an `sr-only` `role="alert"` span; zero visible feedback for sighted users.
  No toast/sonner infrastructure exists anywhere in the codebase yet.
- **Affected requirement:** design/UI-SYSTEM.md §5.6 ("Toast (favorited, reported, saved)");
  indirectly, the "Failure behavior" QA category for this story (a failed mutation must not
  look like nothing happened).

## Regression Results

All run against the branch's current working tree (E4-04 changes on top of E4-03):

| Check | Command | Result |
|---|---|---|
| DB integration probe | `npm run test:db` (includes `test-necesidad-rpc.mjs`, `test-e4-03-profile-view.mjs`, `test-e4-04-favorites.mjs`) | PASS (exit 0; required one Supabase container restart mid-session due to transient Docker health-check flakiness unrelated to this story's migration SQL — confirmed clean on retry) |
| Unit/integration tests | `npm test -- --run --no-file-parallelism` | PASS — 40 files, 268 tests, 0 failures |
| Lint | `npm run lint` | PASS — no errors/warnings |
| Typecheck | `npm run typecheck` | PASS |
| Secret leak check | `npm run check:secrets` | PASS — "no server-only secret exposed client-side" |
| Production build | `npm run build` | PASS — all routes compiled, including `/familia/favoritas` as a dynamic route |

No regressions found in E4-01/E4-02/E4-03 areas (candidate listing, filters, profile
view/detail) — their existing test files are part of the 268 passing tests and were not
modified in ways that changed their assertions beyond what's expected for wiring
`FavoriteToggle` in.

## Recommendation

Do not mark E4-04 VERIFIED yet. Send BUG-001 back to the Developer: add visible error
feedback for a failed favorite/unfavorite (a toast per UI-SYSTEM §5.6 is the most
spec-consistent fix, but a visible inline/danger-styled message near the control would also
resolve the core defect — the success-toast omission is comparatively low-stakes and can be
deferred if the team wants to scope this narrowly, but the failure case should not ship
silent). Everything else in this story — RPC semantics, frozen-snapshot protection,
authorization, eligibility gating, FAM-07 listing/grouping/empty-state, and the Decision 4
no-paywall guarantee — is independently verified and correct; once BUG-001 is fixed, a
re-run of the existing `favorite-toggle.test.tsx`/`favorites.test.ts` suite plus a quick
visual re-check of the new feedback should be sufficient to close this out.

---

# Round 2

## Round 2 Verdict

**REVISION_REQUIRED**

BUG-001 (round 1: silent failure with only `sr-only` feedback) is genuinely fixed at the
*mechanism* level — a real `Toast` component now exists, is wired into `FavoriteToggle` for
both success and failure, and a `try/catch` now guards against a thrown (not just a
returned-`{ok:false}`) server-action failure. However, independent re-verification surfaced
that the fix is not fully effective in a real browser: `components/shared/toast.tsx` uses the
literal Tailwind class `bg-raised`, which does not exist in this codebase's compiled CSS —
every other component that wants the same token uses `bg-bg-raised`. This means the toast
renders with a shadow and text but **no background fill**, i.e. an edgeless, see-through box
floating over whatever page content happens to be scrolled underneath it. This corroborates
Code Review's and Visual QA's independent round-2 findings (already logged as their own
V01/Important Issue #1 reopen) and I concur it is a real, reproducible defect, not merely
cosmetic — it materially undermines whether the failure-feedback fix is "genuinely visible"
per UI-SYSTEM.md §5.6, which is exactly what this round was scoped to re-verify. I'm logging
it here as **BUG-002** for functional-QA-side tracking, deferring primary ownership/severity
framing to Visual QA's more detailed rendering analysis, but it independently blocks my sign-
off too. The new closed-necesidad favorites behavior, by contrast, is implemented correctly
and is independently verified below with no open issues.

## Environment (Round 2)

- Branch: `nanamex/e4-03-fam06-candidate-detail`, working tree with E4-04's round-2 changes
  (shared `Toast`, `try/catch` in `favorite-toggle.tsx`, dropped `estado = 'activa'` filter +
  closed-necesidad de-emphasis in `app/familia/favoritas/page.tsx`, `disabledReason` prop on
  `CandidateCard`).
- **Environment contention:** the local Supabase/Docker stack for this project
  (`supabase_db_nanamex` et al.) could not be brought back up during this session. Multiple
  `supabase stop` / `supabase start` cycles either failed fast (`failed to create migration
  table: unexpected EOF`) or hung with the container set never appearing in `docker ps`
  across an extended wait (a sibling project's Supabase stack, `*_local-menu`, was up and
  healthy throughout on different, non-conflicting ports — 54xxx vs. this project's 55xxx —
  so this looks like local Docker/day-of resource contention rather than a code-caused
  regression). As a result, `npm run test:db` (and therefore a live re-run of
  `scripts/test-e4-04-favorites.mjs`/`.sql`) could **not** be executed this round.
  - **Fallback used, per instruction:** source-level verification of the DB-dependent claims
    below (the RPC's unconditional ownership/`estado = 'activa'` check, which structurally
    guarantees a closed necesidad rejects a favorite/unfavorite RPC call in both directions —
    same code-reading approach round 1 already used for the unauthorized-*unfavorite*
    sub-case, which was never covered by the SQL probe either). Round 1's `test:db` run
    already independently verified every claim in Test Cases 1-6 against a live Postgres on a
    clean database state, and this round did not touch `set_candidate_favorite`'s SQL body at
    all (`db/migrations/20260903000013_candidate_favorites.sql` is byte-identical to what
    round 1 reviewed) — so I have no reason to believe those results have changed, but I
    could not re-confirm them live this round and am flagging that explicitly rather than
    silently claiming a fresh DB pass.
- Everything else (unit tests, lint, typecheck, build, secrets check) ran cleanly against the
  live filesystem/Node toolchain, unaffected by the Docker contention.
- Additionally ran `npm run build` and grepped the emitted CSS
  (`.next/static/chunks/*.css`) directly, to independently confirm the `bg-raised` vs.
  `bg-bg-raised` claim against this project's actual compiled Tailwind v4 output rather than
  taking Visual QA's/Code Review's word for it.

## Test Cases (Round 2)

### 9. BUG-001 fix — visible success toast (mechanism)
- **Expected:** A successful favorite/unfavorite shows a visible, non-`sr-only` confirmation.
- **Actual:** `tests/components/familia/favorite-toggle.test.tsx` "optimistically toggles to
  favorited, confirms via the server action, and shows a visible success toast" (lines 21-38):
  asserts `screen.findByRole("status")` renders with text "Guardada en favoritas" and that
  `toast.className` does **not** match `/sr-only/`. Read `favorite-toggle.tsx` lines 50-51:
  `setToast({ message: next ? "Guardada en favoritas" : "Quitada de favoritas", variant:
  "success" })` on `result.ok`. Confirmed by running the test file directly — passes.
- **Result:** PASS (mechanism). See BUG-002 for the rendering caveat that reduces how visible
  this actually is in a browser.

### 10. BUG-001 fix — visible failure toast, including a thrown (not just returned) failure
- **Expected:** A failed favorite/unfavorite — whether the server action returns `{ok:false}`
  or throws outright (e.g. a network error) — surfaces a visible, non-`sr-only` error message,
  and the optimistic UI reverts correctly in both cases.
- **Actual:** Two distinct test cases in `favorite-toggle.test.tsx`:
  - "reverts the optimistic toggle and shows a visible (non-screen-reader-only) error toast
    when the server action fails" (lines 40-48): `toggleFavoriteAction` resolves
    `{ ok: false, isFavorite: false, message: "..." }`; asserts the button reverts to
    `aria-pressed="false"`, `screen.getByRole("alert")` has the message text, and
    `toast.className` does not match `/sr-only/`.
  - "reverts the optimistic toggle and shows a visible error toast when the server action
    throws" (lines 50-58): `toggleFavoriteAction.mockRejectedValue(new Error("network
    error"))`; asserts the same revert + visible-alert behavior.
  - Read `favorite-toggle.tsx` lines 41-63: the `try { ... } catch { ... }` added this round
    wraps the `await toggleFavoriteAction(...)` call; the `catch` block reverts
    `setIsFavorite(!next)` and sets a generic error toast (`GENERIC_ERROR_MESSAGE`), closing
    the exact gap Code Review's Minor Issue #4 flagged in round 1 (a thrown error previously
    would have left the UI stuck out of sync with zero feedback).
  - Ran both tests directly — both pass.
- **Result:** PASS (mechanism, both the handled-`{ok:false}` and thrown-exception code paths
  now revert correctly and attempt to render a visible message). See BUG-002 for the caveat
  on what "visible" actually renders as.

### 11. BUG-002 (new) — Toast has no background fill: `bg-raised` is not a real Tailwind class
- **Expected:** Per design/UI-SYSTEM.md §5.6, the toast should render as a solid `bg-raised`
  card with `elevation-2` (drop shadow) behind the icon + message.
- **Actual:** Independently reproduced Visual QA's and Code Review's finding by running this
  project's own `next build` and inspecting the compiled CSS directly:
  ```
  grep -oE '\.bg-bg-raised\{[^}]*\}' .next/static/chunks/*.css
  # -> .bg-bg-raised{background-color:var(--color-bg-raised)}   (present)
  grep -oE '\.bg-raised\{[^}]*\}' .next/static/chunks/*.css
  # -> (no output; class does not exist in the compiled bundle)
  ```
  `components/shared/toast.tsx` line 40 uses `bg-raised` (not `bg-bg-raised`) in its
  `className`. Tailwind v4 derives the utility name from the full `@theme` key
  (`--color-bg-raised` in `app/globals.css` line 13), so the real generated utility is
  `bg-bg-raised` — `bg-raised` alone matches nothing and is silently dropped by the build
  (no error, no warning), which is exactly why `npm run build`/lint/typecheck all pass clean
  despite this being a real defect. Every other component that wants this exact background
  (`candidate-card.tsx`, `app/familia/favoritas/page.tsx`'s own `EmptyState`,
  `candidate-detail-actions.tsx`, `trust-badge.tsx`, etc.) correctly uses `bg-bg-raised`,
  confirming this is an isolated typo in the new file, not an ambiguity in the design tokens.
- **Functional read (what the coordinator specifically asked me to assess):** this is not a
  regression back to round 1's "totally silent" defect — the toast component does mount, the
  message text and icon are present in the DOM with correctly variant-colored text
  (`text-ink-900` success / `text-danger-600` error, confirmed by the passing unit tests
  above), and `role="status"`/`role="alert"` are both correctly set. In the app's own layout,
  where most surrounding content also sits on light (`bg-bg`/`bg-bg-raised`) backgrounds, the
  message text itself will very likely still be legible in isolation. But because the
  container has no fill, `shadow-elevation-2`'s drop shadow renders around an invisible box
  (no edges), the icon and text sit directly on top of whatever is scrolled underneath the
  `fixed`-positioned toast rather than a defined card, and legibility/contrast is not
  guaranteed if darker or busier content happens to be underneath at that moment (e.g. a
  candidate's avatar photo, once Epic 7 photos ship). This is a real, spec-violating rendering
  defect with functional bearing (it's a "does the user actually perceive clear feedback"
  question, which is squarely within this QA pass's scope), even though it does not fully
  reproduce round 1's "literally nothing visible" failure mode.
- **Result:** FAIL — logged as BUG-002 below. One-line fix (`bg-raised` → `bg-bg-raised`).

### 12. Closed-necesidad favorites remain listed on FAM-07, correctly de-emphasized
- **Expected:** A favorite whose necesidad has since closed (`cerrada_contratada`/
  `cerrada_cancelada`) must not disappear from FAM-07 (per `screen-inventory.md`'s "across all
  necesidades" and `es_favorita`'s permanence per architecture.md §17), but should read as
  closed/archived, not as an active, actionable card.
- **Actual:** `app/familia/favoritas/page.tsx`'s Supabase query (lines 145-149) no longer
  filters on `.eq("estado", "activa")` — confirmed by reading the query directly; it selects
  all of the family's `necesidades` regardless of `estado`. `buildGroups` (lines 87-130)
  computes `isClosed = necesidad.estado !== "activa"` per group and, for closed groups, omits
  `necesidadId` from each `CandidateCardData` (line 107: `necesidadId: isClosed ? undefined :
  necesidad.id`). Ran `tests/app/familia-favoritas.test.tsx`'s "still shows favorites saved
  under a closed necesidad, de-emphasized and without a working link" test directly (part of
  the 272 passing tests) — it constructs a necesidad with `estado: "cerrada_contratada"` and
  one favorited candidate, and asserts: the candidate's name renders, a "Necesidad cerrada"
  caption renders, no "Ver candidatas" group link renders, and both the "Ver perfil" button
  and the "Guardar favorita" button render as **disabled** (`toBeDisabled()`, RTL's real
  `disabled` attribute check, not a class/style heuristic). Also ran the sibling "only offers
  the first active necesidad (not a closed one) as the empty-state CTA target" test — confirms
  a closed necesidad is correctly excluded from the empty-state CTA candidate pool too.
- **Result:** PASS — both new tests pass, and the assertions genuinely check for a real
  `disabled` HTML attribute rather than a visual-only class, addressing the concern that this
  might be "dimmed but still functionally toggleable."

### 13. Closed-necesidad favorite/unfavorite is genuinely non-functional, not just visually dimmed (UI level)
- **Expected:** For a closed-necesidad group, the heart toggle must not be a live
  `FavoriteToggle` with some CSS applied — it must be structurally incapable of firing a
  mutation.
- **Actual:** Read `components/familia/candidate-card.tsx` lines 87-106: when
  `candidate.necesidadId` is falsy (which `buildGroups` guarantees for every closed-group
  candidate), the component renders an entirely different subtree — a plain `<button
  type="button" disabled ... className="pointer-events-none ... opacity-40">` with a static
  `Heart` icon and no `onClick` handler at all — **not** the `FavoriteToggle` component. There
  is no `toggleFavoriteAction` reference, no `useState`, no event wiring anywhere in this
  branch; a user cannot cause a mutation attempt from this control regardless of how it's
  dimmed. This directly answers the coordinator's ask to distinguish "genuinely disabled" from
  "visually dimmed but still functionally toggleable" — it is the former. Same is true for
  "Ver perfil" (renders a `disabled` `<button>` in place of the `Link`, so no navigation is
  possible either). This structural analysis, combined with Test Case 12's `toBeDisabled()`
  assertions, is sufficient to close this check without needing a live browser or a real
  closed necesidad to click through, given no code path in this repo can currently produce
  that state outside of a direct DB write (E6/necesidad-closure is not built yet, consistent
  with Code Review's round-1 note).
- **Result:** PASS

### 14. Closed-necesidad favorite/unfavorite is rejected at the RPC layer too (defense in depth)
- **Expected:** Even if a client somehow bypassed the disabled UI (e.g. a modified
  `necesidadId` prop or a direct API call), `set_candidate_favorite` should still reject a
  mutation against a non-`activa` necesidad, consistent with round 1's ownership-check
  verification.
- **Actual:** Source-level verification (DB probe unavailable this round — see Environment
  note above). `db/migrations/20260903000013_candidate_favorites.sql` lines 27-30:
  ```sql
  if not exists (
    select 1 from public.necesidades
    where id = p_necesidad_id and familia_id = p_familia_id and estado = 'activa'
  ) then raise exception 'candidate_view_not_allowed'; end if;
  ```
  This check runs **before** the `if p_favorite then ... else ...` branch (line 32), so it is
  structurally unconditional on direction — a necesidad with `estado <> 'activa'` (including
  `cerrada_contratada`/`cerrada_cancelada`) fails this `exists` check and raises regardless of
  whether `p_favorite` is `true` or `false`. This is the same code shape round 1 already used
  to verify the unauthorized-*unfavorite* sub-case (never covered by the SQL probe either),
  and this round's diff does not touch this function's body at all — confirmed by diffing
  against round 1's already-verified copy of the same file (unchanged). I was unable to
  re-execute this against a live database this round due to the Docker/Supabase environment
  contention noted above, so this is code-inspection confidence, not a fresh live-DB
  confirmation — flagging that gap explicitly rather than claiming a live re-run that didn't
  happen.
- **Result:** PASS (source-level; DB-level re-confirmation blocked by environment, not by any
  code change — see Environment note)

## Bugs (Round 2)

### BUG-002 — Toast renders with no background fill; `bg-raised` is not a real Tailwind class in this codebase
- **Severity:** Major
- **Reproduction:**
  1. Read `components/shared/toast.tsx` line 40 — `className="... bg-raised ...
     shadow-elevation-2 ..."`.
  2. From `projects/nanamex/`, run `npm run build`, then:
     - `grep -oE '\.bg-bg-raised\{[^}]*\}' .next/static/chunks/*.css` → present.
     - `grep -oE '\.bg-raised\{[^}]*\}' .next/static/chunks/*.css` → no output (class does not
       exist in the compiled bundle at all).
  3. Compare against any of the ~15 other call sites in this codebase (`candidate-card.tsx`,
     `app/familia/favoritas/page.tsx`'s own `EmptyState`, `candidate-detail-actions.tsx`,
     `trust-badge.tsx`, etc.) that all correctly use `bg-bg-raised` for the same
     `--color-bg-raised` token.
- **Expected:** design/UI-SYSTEM.md §5.6: toast is a solid `bg-raised` (i.e. `bg-bg-raised`)
  card with `elevation-2`, containing icon + message.
- **Actual:** The toast container has a shadow and rounded corners but no background color at
  all — a transparent box; text/icon render directly over whatever page content is scrolled
  underneath the fixed-position toast.
- **Affected requirement:** design/UI-SYSTEM.md §5.6 ("Toast (favorited, reported, saved) ...
  `bg-raised` with `elevation-2`"); indirectly re-opens part of this story's "Failure
  behavior" bar, since the fix for BUG-001 is only fully effective if the resulting feedback
  is reliably legible, and a fill-less floating text/shadow combo is not guaranteed to be
  across all page contexts.
- **Fix:** change `bg-raised` to `bg-bg-raised` on `components/shared/toast.tsx` line 40 —
  confirmed one-line/one-class-name fix; no other part of the component needs to change.
- **Cross-reference:** independently confirmed by Code Review (Important Issue, round 2) and
  Visual QA (V01, round 2) — three independent reviewers reached the same finding via
  different methods (source reading, compiled-CSS inspection, design-token cross-reference).

## Regression Results (Round 2)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test -- --run --no-file-parallelism` | PASS — 40 files, 272 tests, 0 failures |
| Lint | `npm run lint` | PASS — no errors/warnings |
| Typecheck | `npm run typecheck` | PASS |
| Secret leak check | `npm run check:secrets` | PASS — "no server-only secret exposed client-side" |
| Production build | `npm run build` | PASS — all routes compiled, including `/familia/favoritas` |
| DB integration probe | `npm run test:db` | **BLOCKED** — local Supabase/Docker stack for this project could not be brought up this session (see Environment note); not a code regression, but genuinely not re-run live this round. Source-level review confirms the RPC file this round's diff does not touch is unchanged from round 1's already-verified copy. |

272 tests is 4 more than round 1's 268, consistent with the new success-toast and
thrown-exception test cases in `favorite-toggle.test.tsx` plus the closed-necesidad tests in
`familia-favoritas.test.tsx`. No regressions found in E4-01/E4-02/E4-03 areas or in round 1's
already-passing favorites test files.

## Round 2 Recommendation

Do not mark E4-04 VERIFIED yet. BUG-001 is fixed at the mechanism level (real success/failure
toast wiring, thrown-exception handling) and should not need to be revisited once BUG-002 is
resolved. Send BUG-002 back to the Developer: it is a one-line fix (`bg-raised` →
`bg-bg-raised` in `components/shared/toast.tsx`), already independently corroborated by Code
Review and Visual QA, and should be fast to land and re-verify. The new closed-necesidad
favorites behavior (Test Cases 12-14) is implemented correctly and is both genuinely disabled
at the UI level (real `disabled` HTML attribute, no event handler present, structurally
distinct component branch — not a dimmed-but-live control) and defended at the RPC layer via
an unconditional ownership/`estado = 'activa'` check that applies to both favorite and
unfavorite directions. The one open gap in my own verification this round is that
`npm run test:db` could not be executed live due to Docker/Supabase environment contention
unrelated to this story's code (the RPC file is byte-identical to round 1's live-verified
copy) — this should be re-run live in the next round once the environment is available, even
though I have no code-level reason to expect a different result. Once BUG-002 is fixed, a
re-run of `favorite-toggle.test.tsx` (already covers the visible-toast assertions) plus a
quick visual re-check (Visual QA) and a live `npm run test:db` pass should be sufficient to
close this story out.

---

# Round 3 (Final)

## Round 3 Verdict

**VERIFIED**

This is the final review cycle for E4-04 per AGENTS.md's 3-cycle maximum. BUG-002 (round 2:
`Toast` used the non-existent Tailwind class `bg-raised`, rendering with no background fill)
is genuinely fixed at both the source and compiled-CSS level. The two Visual QA-flagged minor
styling items from round 2 (V03 compounding opacity on closed-necesidad favorites, V04
disabled-button alignment) are also both correctly fixed. No new defects found. Combined with
round 1's independently-verified RPC semantics/authorization/eligibility/frozen-snapshot
behavior and round 2's independently-verified closed-necesidad handling (never re-touched by
this round's diff), I'm closing out this story as VERIFIED. One caveat, consistent with round
2: a live `npm run test:db` could not be completed this round due to active Docker/Supabase
contention from another agent's concurrent process (detail below) — this is a code-agnostic
environment limitation, not a defect, and is mitigated by the migration file being
byte-for-byte unchanged from the copy round 1 already executed live to a clean PASS.

## Environment (Round 3)

- Branch: `nanamex/e4-03-fam06-candidate-detail`, working tree with round 3's changes:
  `components/shared/toast.tsx` (`bg-raised` → `bg-bg-raised`), `app/familia/favoritas/page.tsx`
  (removed the redundant `opacity-70` group-grid wrapper — V03), `components/familia/
  candidate-card.tsx` (added `min-h-11 inline-flex items-center` to the disabled "Ver perfil"
  placeholder — V04). No other files in this round's diff touch favorites logic.
- Node test runner: Vitest v4.1.11. Next.js 16.3.4 (Turbopack) for the production build.
- **Test:db / Docker contention:** at the time of this round, `docker ps` showed
  `supabase_db_nanamex` and its sibling containers cycling through fresh "Up N seconds
  (health: starting)" states — consistent with another agent's `supabase start`/`npm run
  test:db` invocation running concurrently against the same local Docker daemon (confirmed via
  `ps aux` showing a live `supabase db reset --local` process I did not start). I attempted
  `npm run test:db` exactly once; it failed fast with `error running container: exit 1` during
  `supabase db reset --local` (a container/image-pull race, not a SQL or migration error — no
  migration ever ran far enough to report a schema issue). Per instructions, I did not retry
  further to avoid compounding contention with the other agent's run.
  - **Fallback used:** read `db/migrations/20260903000013_candidate_favorites.sql` in full and
    confirmed it is byte-for-byte identical (same `set_candidate_favorite` body: unconditional
    ownership/`estado = 'activa'` check at lines 27-30, eligibility check at lines 33-38,
    `on conflict ... do update set es_favorita = true, updated_at = now()` at lines 41-43 with
    snapshot columns absent from the update clause, unfavorite no-op `update` at lines 47-48)
    to the version already executed live against a clean local Postgres in Round 1
    (`scripts/test-e4-04-favorites.sql`, all seven assertions passed) and confirmed unchanged
    again in Round 2. This round's diff (toast class fix, opacity-wrapper removal, button
    alignment classes) touches zero SQL/RPC files, so there is no code-level reason to expect a
    different DB-level result than Round 1's live PASS.

## Test Cases (Round 3)

### 15. BUG-002 fix — Toast renders with a real background fill (`bg-bg-raised`, not `bg-raised`)
- **Expected:** design/UI-SYSTEM.md §5.6: toast is a solid `bg-raised`-token card with
  `elevation-2`. Per round 2, the correct Tailwind utility for this project's `--color-bg-raised`
  token is `bg-bg-raised`.
- **Actual:** Read `components/shared/toast.tsx` line 40 directly:
  `className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-2 rounded-sm bg-bg-raised
  px-4 py-3 text-body-sm shadow-elevation-2 sm:inset-x-auto sm:left-4 sm:w-80"` — `bg-raised`
  has been replaced with `bg-bg-raised`; no other part of the className string changed.
  Independently ran a fresh `npm run build` and grepped the compiled CSS bundle directly
  (not taking the source diff's word for it, same methodology as round 2):
  ```
  grep -oE '\.bg-bg-raised\{[^}]*\}' .next/static/chunks/*.css
  # -> .bg-bg-raised{background-color:var(--color-bg-raised)}   (present)
  grep -oE '\.bg-raised\{[^}]*\}' .next/static/chunks/*.css
  # -> (no output — exit code 1, class does not exist anywhere in the compiled bundle)
  ```
  Also grepped the full source tree for any remaining literal `bg-raised` class usage outside
  comments/spec quotes: the only two matches left in the repo
  (`components/auth/unauthorized-banner.tsx` line 14, `components/shared/toast.tsx` line 19)
  are both inside doc comments quoting UI-SYSTEM.md's own prose ("`bg-raised` with
  `elevation-2`"), not `className` strings — confirmed by reading both lines directly, neither
  is inside a `className`. Read `favorite-toggle.tsx` in full: it still wires `Toast` into both
  the success path (`result.ok`) and both failure paths (`{ok:false}` and the `catch` block for
  a thrown error), unchanged from round 2's already-verified mechanism — this round only
  touched the CSS class, not the wiring logic. Ran
  `tests/components/familia/favorite-toggle.test.tsx` directly: all 5 tests pass, including the
  two that assert `toast.className` does not match `/sr-only/` (a regression guard against
  round 1's original defect, not round 2's — but still exercised and green).
- **Result:** PASS. BUG-002 is closed.

### 16. V03 fix — Closed-necesidad favorites no longer double-compound opacity
- **Expected:** Disabled controls inside a closed-necesidad group should render at the
  project's documented 40% opacity (UI-SYSTEM.md §5.1), not a compounded 28% from a redundant
  outer wrapper.
- **Actual:** Read `app/familia/favoritas/page.tsx` in full: the `opacity-70` class that
  previously wrapped the entire closed-group card grid (round 2's line 225) has been removed
  entirely — the grid wrapper is now unconditionally
  `"mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"` with no `group.isClosed`
  branch at all. Grepped the file for `opacity-70`/`opacity-`: zero matches for any
  card-grid-level opacity class; the only remaining opacity usage is the per-control
  `opacity-40` already applied individually inside `candidate-card.tsx`'s disabled-placeholder
  branch (unchanged, correct per §5.1). This means a closed group's disabled heart/"Ver perfil"
  controls now render at a true, uncompounded 40% opacity, while the closed-group signal (muted
  `text-ink-400` heading + "Necesidad cerrada" caption, both outside any opacity wrapper) is
  unaffected and still clearly present. Ran `tests/app/familia-favoritas.test.tsx` directly:
  all closed-necesidad tests (including "still shows favorites saved under a closed necesidad,
  de-emphasized and without a working link") still pass — no assertion in that suite depended
  on the removed `opacity-70` class, so removing it did not require a test update, and no
  behavioral coverage was lost.
- **Result:** PASS. V03 is closed.

### 17. V04 fix — Disabled "Ver perfil" placeholder now matches the enabled version's alignment classes
- **Expected:** The disabled "Ver perfil" placeholder should carry the same
  `min-h-11 inline-flex items-center` classes as the enabled `Link` version, so a closed-group
  card's footer doesn't visibly misalign next to the active-group version.
- **Actual:** Read `components/familia/candidate-card.tsx` directly: the disabled placeholder
  button is now `className="pointer-events-none min-h-11 inline-flex items-center text-button
  text-primary-600 opacity-40"` — `min-h-11 inline-flex items-center` has been added, matching
  the enabled `Link`'s `"min-h-11 inline-flex items-center text-button text-primary-600"`
  exactly (modulo `pointer-events-none opacity-40` for the disabled state, which is expected
  and correct). Ran `tests/components/familia/candidate-card.test.tsx` directly: all tests
  pass, no regressions from the added classes (RTL doesn't assert exact className strings for
  this element beyond `toBeDisabled()`/text-content checks already covered in round 2).
- **Result:** PASS. V04 is closed.

### 18. No regression to round 1/2's core RPC, authorization, eligibility, and frozen-snapshot behavior
- **Expected:** None of round 3's changes (a CSS class fix and two purely cosmetic wrapper/class
  adjustments) should have any bearing on server-side favorite/unfavorite semantics.
- **Actual:** Confirmed via `git status`/diff review that round 3's changed files are limited to
  `components/shared/toast.tsx`, `app/familia/favoritas/page.tsx` (grid className only), and
  `components/familia/candidate-card.tsx` (disabled-button className only) — zero changes to
  `actions/favorites.ts`, `db/migrations/20260903000013_candidate_favorites.sql`, or
  `components/familia/favorite-toggle.tsx`'s logic (only its `Toast` child's own className
  changed, not `favorite-toggle.tsx` itself). Re-ran the full suite (see Regression Results
  below): all 272 tests pass, same count as round 2, confirming no test needed updating and no
  existing assertion broke.
- **Result:** PASS

## Bugs (Round 3)

No new bugs found this round. Both BUG-001 (round 1) and BUG-002 (round 2) are closed:

- **BUG-001** — No visible (non-screen-reader) feedback on favorite/unfavorite failure.
  Status: **CLOSED** (fixed in round 2, re-confirmed working in round 3 via the still-passing
  `favorite-toggle.test.tsx` suite and source reading).
- **BUG-002** — Toast rendered with no background fill (`bg-raised` invalid Tailwind class).
  Status: **CLOSED** (fixed this round; confirmed both at the source level and against the
  actual compiled CSS bundle from a fresh `next build`).

## Regression Results (Round 3)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test -- --run --no-file-parallelism` | PASS — 40 files, 272 tests, 0 failures |
| Lint | `npm run lint` | PASS — no errors/warnings |
| Typecheck | `npm run typecheck` | PASS |
| Secret leak check | `npm run check:secrets` | PASS — "no server-only secret exposed client-side" |
| Production build | `npm run build` | PASS — all routes compiled, including `/familia/favoritas`; compiled CSS independently grepped to confirm `bg-bg-raised` present and `bg-raised` absent |
| DB integration probe | `npm run test:db` | **BLOCKED by environment contention** — another agent's concurrent `supabase start`/`test:db` run was actively cycling this project's Docker containers at the time of my one attempt, which failed fast (`error running container: exit 1`) during `supabase db reset --local`, before any migration/SQL ran. Not a code regression: this round's diff touches zero SQL/RPC files, and the migration file is byte-for-byte identical to the copy Round 1 already executed live to a clean PASS (all 7 assertions) and Round 2 re-confirmed unchanged by diff. Per instructions, did not retry further to avoid compounding contention. |

272 tests matches round 2's count exactly — expected, since this round's fixes are pure
CSS-class/markup corrections with no new behavior to cover, and no existing test needed
updating (none asserted on the specific classes that changed).

Visual QA's round 3 pass independently returned VERIFIED, confirming all three fixes (BUG-002,
V03, V04) render correctly.

## Round 3 Recommendation

**Mark E4-04 VERIFIED.** All blocking defects from rounds 1-2 (BUG-001: silent failure
feedback; BUG-002: invisible/fill-less toast) are fixed and independently re-confirmed at both
the source and compiled-CSS level. Both Visual QA-flagged minor items (V03 opacity compounding,
V04 button alignment) are also fixed with no regressions. The full automated regression suite
(lint, typecheck, unit/integration tests, secret-leak check, production build) passes cleanly.
The one residual gap is a live `npm run test:db` re-run, which was blocked this round purely by
transient multi-agent Docker/Supabase contention, not by any code issue — the underlying
migration SQL is unchanged from Round 1's clean live-execution PASS and untouched by any of
rounds 2-3's diffs, so I have high confidence this would pass live if re-run once the
environment is uncontended. I recommend the orchestrator (or a future maintenance pass) run
`npm run test:db` once as a final belt-and-suspenders confirmation when Docker is free, but I
am not treating this as blocking VERIFIED given three consecutive rounds of unchanged,
already-verified SQL and the maximum review-cycle count for this story having been reached.
