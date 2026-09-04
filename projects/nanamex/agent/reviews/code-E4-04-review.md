# Code Review — E4-04 (FAM-07 Favoritas)

## Verdict

**REVISE**

The trust-boundary, frozen-snapshot, and paywall-free correctness claims all check out
independently (see below) and the DB probe genuinely exercises what it claims to. However,
`FavoriteToggle` never renders the visible toast that `UI-SYSTEM.md` §5.6 explicitly names
"favorited" as a use case for — it only ever shows a `sr-only` (screen-reader-only) message,
and only on failure, never a success confirmation at all. Functional QA and Visual QA both
independently returned REVISION_REQUIRED for this same gap, which corroborates it as a real
spec violation rather than a stylistic nitpick, so this review defers to that consensus and
does not pass the story as-is. The `.eq("estado", "activa")` scoping gap on the Favoritas
list (Important Issue #1) should be resolved or explicitly documented in the same revision
pass.

## Critical Issues

None.

## Important Issues

1. **No visible toast for favorite/unfavorite feedback (UI-SYSTEM.md §5.6).** §5.6 lists
   "favorited" by name as one of the three canonical toast use cases ("Toast (favorited,
   reported, saved): bottom-anchored (mobile) / bottom-left (desktop), single line, icon +
   message, `bg-raised` with `elevation-2`, auto-dismiss 4s..."). `components/familia/
   favorite-toggle.tsx` implements no toast at all: on success it silently flips the heart
   icon with no confirmation of any kind; on failure it reverts the icon and sets
   `<span role="alert" className="sr-only">{error}</span>` — a screen-reader-only string,
   invisible to sighted users. A sighted user who accidentally causes (or randomly hits) a
   quiet failure (session expiry mid-session, transient RPC error, etc.) will see the heart
   silently revert with **zero visible explanation**, and even a successful favorite gets no
   positive confirmation the spec calls for. This was independently flagged
   REVISION_REQUIRED by both Functional QA and Visual QA — this review concurs it is a
   genuine, spec-traceable gap (not a nice-to-have), and it should block VERIFIED status.
2. **`app/familia/favoritas/page.tsx` only queries necesidades with `estado = 'activa'`**
   (`.eq("estado", "activa")`), but `design/screen-inventory.md` describes FAM-07 as "Saved
   niñeras **across all necesidades**," and `UI-SPEC.md`'s FAM-07 section does not restrict
   the list to active ones. Once a necesidad reaches a `cerrada_*` state, any niñera
   favorited under it will silently disappear from the Favoritas list even though
   `pipeline.es_favorita` stays `true` and the row is never deleted (§17's permanence
   rule) — the UI just stops surfacing it.
   - **Mitigating factor:** no code path in this repo can currently set a necesidad to
     `cerrada_contratada`/`cerrada_cancelada` (that's E2/E6 scope, not yet built), and the
     same `estado = 'activa'` filter already exists on the sibling FAM-04/FAM-06 pages this
     page was modeled on — so this is currently a **dormant** gap, not an exploitable bug
     today. It still needs a decision recorded (broaden the filter, or explicitly scope
     Favoritas to active necesidades in the spec docs) before E6 ships necesidad closure,
     or favorited-but-now-hired/discarded candidates will vanish from a family's own
     favorites list with no explanation.

## Minor Issues

1. **`candidate-card.tsx`'s disabled-placeholder heart button uses `opacity-40` +
   `pointer-events-none` + `title="Guardar favorita (próximamente)"`** for the no-`necesidadId`
   fallback case. This is a reasonable, low-risk pattern (mirrors the existing "Ver perfil"
   disabled fallback in the same component) and is not reachable from any current caller —
   both current callers (`FAM-04` listing and `FAM-07` favoritas) always supply
   `necesidadId`, so the disabled branch is dead code in practice today, kept only for a
   "hypothetical future caller" per the inline comment. Not a defect, just noting it's
   unexercised by any test and unreachable in the current call graph — fine to leave as
   defensive scaffolding, but don't let it accumulate untested dead branches.
2. `tests/db/candidate-favorites-migration.test.ts` is a pure string-match test against the
   raw SQL file content (`expect(migration).toContain(...)`) rather than an executed
   assertion. It adds near-zero verification value beyond the real DB probe
   (`scripts/test-e4-04-favorites.sql`/`.mjs`), which is where the actual behavioral
   coverage lives. Not worth blocking on, but flag it if the pattern is repeated going
   forward.
3. `set_candidate_favorite`'s row-creation branch accepts whatever `p_match_score`/
   `p_match_checklist` the client sends without re-deriving/verifying the score
   server-side — same trust posture as E4-03's `record_candidate_profile_view`, already
   accepted in that review. Not a new issue introduced here, but now present in two RPCs;
   if this trust boundary is ever tightened, both call sites need to move together.
4. `FavoriteToggle`'s optimistic update reverts to `result.isFavorite` on a handled
   failure, but if `toggleFavoriteAction` ever threw instead of returning
   (`ok: false, ...}`), the `startTransition` callback's promise would reject and the heart
   would be left in the wrong optimistic state with no visible feedback at all — compounds
   Important Issue #1 rather than being separate from it. A defensive `try/catch` around
   the `await toggleFavoriteAction(...)` call would close this even before the toast fix
   lands.

## Security Observations

- `actions/favorites.ts` correctly derives `familia_id` from `supabase.auth.getUser()`
  (`user.id`), never from client input — verified by reading the action and by
  `tests/actions/favorites.test.ts`'s explicit "calls set_candidate_favorite with the
  authenticated family id, not a client-supplied one" test.
- Role check (`profile.role !== "familia"`) happens before the RPC call; a non-familia or
  unauthenticated caller never reaches `db.rpc`.
- `set_candidate_favorite` is `SECURITY DEFINER`, revokes execute from
  `public`/`anon`/`authenticated`, and grants only to `service_role` — matching E4-03's
  `record_candidate_profile_view` posture. It independently re-validates necesidad
  ownership (`familia_id = p_familia_id and estado = 'activa'`) and candidate eligibility
  (`publicado`/`perfil_completo`/`account_status = 'activa'`) before writing, so a
  bypassed/compromised client-side check cannot favorite an ineligible candidate or write
  into another family's necesidad. Confirmed via the DB probe: the wrong-owner and
  unpublished-candidate cases both raise and are caught by the corresponding assertions.
- No entitlement/paywall check exists anywhere on the favorite path (action, RPC, or UI) —
  correctly matches `UX-spec.md` Decision 4 ("favoriting... remain[s] entirely free and
  unlimited"). Confirmed by reading `favorite-toggle.tsx`, `favorites.ts`, and both
  `candidate-card.tsx`/`candidate-detail-actions.tsx` call sites — `Contactar` stays a
  disabled, unwired placeholder button in both, with no favorite-adjacent gating logic.
- No E5 (paywall/entitlement) or E9 (report) functionality has leaked into this story's
  diff. Grepped the new/changed files for `entitlement`, `checkout`, `reportar`, etc. —
  none found outside comments citing Decision 4/architecture §17 for context.
- `es_favorita` is only ever written through the SECURITY DEFINER RPC (service-role-only
  execute grant); no direct client-writable RLS policy on `pipeline.es_favorita` was
  introduced by this migration.

## Test Coverage Observations

- Unit tests (`tests/actions/favorites.test.ts`, `tests/components/familia/
  favorite-toggle.test.tsx`, `tests/app/familia-favoritas.test.tsx`) cover: malformed
  input rejection, unauthenticated caller rejection, non-familia caller rejection, correct
  server-derived `familia_id` propagation, optimistic-UI revert on failure, unfavorite
  path, empty-state (with/without an active necesidad to link to), grouping by necesidad,
  dropping a favorite whose candidate is no longer live-eligible, and a retry banner on
  read failure.
- None of the component-level tests assert on a visible toast appearing (there isn't one to
  assert on), which is itself evidence supporting Important Issue #1 — the gap isn't just
  a visual-inspection finding, it's also untested at the unit level.
- The trust-boundary and frozen-snapshot claims are verified by
  `scripts/test-e4-04-favorites.sql` (executed via `scripts/test-e4-04-favorites.mjs`),
  independently re-run for this review (see Validation section) — covers wrong-owner
  rejection, unpublished-candidate rejection, favorite-creates-row-with-frozen-snapshot,
  repeat-favorite-never-re-freezes, unfavorite-flips-without-deleting,
  unfavorite-no-row-is-noop, and favorite-on-existing-row-only-flips-flag. All seven
  assertions were read in full and independently confirmed to actually exercise the claimed
  behavior (not tautological), and the script exits 0 on this branch.
- Gap: no automated test covers the "favorite under a closed necesidad" scenario in
  Important Issue #2 — reasonable, since no code path can produce that state yet, but worth
  adding once E6 ships necesidad closure.

## Acceptance Criteria Assessment

(`implementation-plan.md`'s E4-04 entry is sparse — one line, "Dependencies: E4-03" — so
acceptance criteria are drawn from `UI-SPEC.md` FAM-07, `UI-SYSTEM.md` §5.6, `UX-spec.md`
Decision 4 and the FAM-04/FAM-06 "Guardar favorita" action descriptions, `database.md` §6,
and `architecture.md` §17/§20, per the review brief.)

| Criterion | Verdict |
|---|---|
| Favoriting/unfavoriting is free and never paywall/entitlement-gated (UX-spec Decision 4) | PASS |
| Family id for the favorite action is derived server-side from the authenticated session, not trusted from the client (architecture §20) | PASS |
| `set_candidate_favorite` RPC re-validates necesidad ownership + candidate eligibility server-side (defense-in-depth, mirrors E4-03) | PASS |
| First favorite creates a pipeline row with a frozen `match_score_snapshot`/`match_checklist_snapshot` (database §6, architecture §17) | PASS |
| A later favorite/unfavorite on an existing row never re-freezes the snapshot | PASS |
| Unfavorite flips `es_favorita` without ever deleting the pipeline row | PASS |
| Unfavoriting a pair with no existing row is a no-op, not an error | PASS |
| FAM-07 uses the same card component as FAM-04 (photo, nombre, TrustBadge, compact MatchScore) | PASS |
| FAM-07 groups favorites by necesidad when a niñera is favorited under more than one | PASS |
| FAM-07 empty state matches spec copy + CTA to first active necesidad's FAM-04 (or dashboard if none) | PASS |
| FAM-07 shows saved niñeras "across all necesidades" (screen-inventory.md), not just active ones | FAIL (Important Issue #2 — dormant, not currently reachable) |
| Favorite/unfavorite gives visible toast feedback per UI-SYSTEM.md §5.6's named "favorited" use case | FAIL (Important Issue #1) |
| No E5 (paywall/checkout/entitlement) or E9 (report) functionality leaked into this story's scope | PASS |
| Nav entry point to FAM-07 exists from the family dashboard | PASS |

## Required Changes

1. **Blocking.** Add the visible toast `UI-SYSTEM.md` §5.6 specifies for the "favorited"
   case: bottom-anchored (mobile) / bottom-left (desktop), single line, icon + message,
   `bg-raised` with `elevation-2`, auto-dismiss 4s, max one visible at a time. This should
   fire on successful favorite/unfavorite (a short confirmation) and should also carry the
   failure message visibly (not only via the current `sr-only` span) so a sighted user
   isn't left with an unexplained silent revert. Keep the `sr-only`/`role="alert"` text for
   assistive tech, but it must not be the *only* channel.
2. **Blocking (or explicitly documented/deferred).** Resolve the `.eq("estado", "activa")`
   scoping question on `FavoritasPage`: either broaden the query to include closed
   necesidades so favorited candidates don't disappear once a necesidad closes, or record
   an explicit decision in `agent/DECISIONS.md`/`UI-SPEC.md` that Favoritas is intentionally
   scoped to active necesidades only, so this isn't rediscovered as a bug once E6 ships
   necesidad closure.
3. **Non-blocking, nice-to-have.** Wrap `FavoriteToggle`'s `await toggleFavoriteAction(...)`
   call in a `try/catch` so an unexpected thrown error (as opposed to a handled
   `{ ok: false }` return) can't leave the optimistic UI stuck in the wrong state with zero
   feedback — same fix location as Required Change #1, worth doing together.
4. **Non-blocking, optional.** Replace or supplement `tests/db/candidate-favorites-migration.test.ts`'s
   string-matching assertions with something that exercises the migration/RPC directly (or
   drop it, since `scripts/test-e4-04-favorites.sql` already covers the real behavior).

## Validation Performed Independently

- `npm run lint` — clean.
- `npm run typecheck` — clean.
- `npm test -- --run` — 268 tests passed (40 files).
- `npm run build` (`next build`) — compiled and generated successfully.
- `npm run check:secrets` — OK, no server-only secret exposed client-side.
- `npm run test:db` — local Supabase needed to be fully re-provisioned (a stale
  `schema_migrations` state from a prior container caused a transient duplicate-key error
  unrelated to this migration's content); after `supabase stop --no-backup` +
  `supabase start` + `supabase db reset --local`, all migrations including
  `20260903000013_candidate_favorites.sql` applied cleanly, and both
  `scripts/test-e4-03-profile-view.mjs` and `scripts/test-e4-04-favorites.mjs` were run
  directly against the freshly reset database and exited 0. `scripts/test-e4-04-favorites.sql`
  was read in full and its seven assertions were independently confirmed to test the claims
  in the developer's report, not just to pass trivially (wrong-owner rejection,
  unpublished-candidate rejection, frozen-snapshot creation, no-re-freeze-on-repeat,
  unfavorite-flips-without-deleting, unfavorite-no-row-is-noop, and
  favorite-on-existing-row-only-flips-flag).
- Confirmed `projects/test-invoice-generator/**` deletions and `.claude/settings.json` are
  pre-existing, unrelated working-tree state on this branch — not part of E4-04's actual
  diff (the new/changed files for this story are limited to `actions/favorites.ts`,
  `components/familia/favorite-toggle.tsx`, `components/familia/candidate-card.tsx`,
  `components/familia/candidate-detail-actions.tsx`, `app/familia/favoritas/**`,
  `app/familia/page.tsx`, `db/migrations/20260903000013_candidate_favorites.sql`,
  `scripts/test-e4-04-favorites.{sql,mjs}`, and the corresponding test files). These
  unrelated changes should not be swept into a commit for this story.

---

# Round 2

## Verdict (Round 2)

**REVISE**

Round 1's two blocking findings were substantively addressed, and the fixes are real, not
cosmetic: `FavoriteToggle` now shows a genuinely visible confirmation/error toast via a new
shared `components/shared/toast.tsx`, the `try/catch` requested as a non-blocking nice-to-have
was also added and correctly reverts optimistic state on a thrown error, the
`.eq("estado", "activa")` scoping gap was resolved by including closed-necesidad favorites
(safely de-emphasized rather than left interactive), and both Minor Issues were closed. This
round would otherwise be a clean PASS. However, a new, self-contained defect was found (by
Visual QA round 2, and independently confirmed here): the new `Toast` component's background
uses a Tailwind class, `bg-raised`, that does not exist in this codebase's design-token
mapping (`app/globals.css` only defines `--color-bg-raised`, consumed everywhere else via the
`bg-bg-raised` utility). Tailwind v4 silently drops unrecognized utility classes rather than
erroring, so the toast currently renders with **no background fill** — undermining the very
"visible toast" fix this round exists to deliver, since a message rendered directly over
page content with no card/elevation background is materially harder to notice and reads as
broken/unstyled. This is a small, one-line, unambiguous fix, but it is exactly the kind of
regression `lint`/`typecheck`/`build` cannot catch (an invalid Tailwind utility is just inert
CSS, not a type or syntax error), so it needs a real visual pass before being called VERIFIED.

## Round 2 — Verification of Round 1's Required Changes

1. **Visible toast (Required Change #1) — substantively fixed, with one new defect.**
   `components/shared/toast.tsx` is a new shared component, genuinely rendered (not
   `sr-only`): `role={variant === "error" ? "alert" : "status"}`, `fixed inset-x-4 bottom-4`
   positioning (bottom-anchored mobile / `sm:left-4` bottom-left desktop, matching
   §5.6's exact layout spec), icon + message, `shadow-elevation-2` (correctly wired to
   `--shadow-elevation-2` in `app/globals.css`), and a 4s auto-dismiss timer
   (`durationMs = 4000`) via `useEffect`/`setTimeout`. `favorite-toggle.tsx` fires it on
   both success (`"Guardada en favoritas"`/`"Quitada de favoritas"`) and failure (the
   server's message or a generic fallback), and the `sr-only` channel from round 1 was
   replaced entirely rather than kept as a silent duplicate. Confirmed with
   `tests/components/familia/favorite-toggle.test.tsx`'s new assertions
   (`screen.getByRole("status")`/`getByRole("alert")` with real `toHaveTextContent(...)` and
   an explicit `expect(toast.className).not.toMatch(/sr-only/)`), which is genuine coverage
   of the visibility claim, not just an existence check.
   - **New defect (blocking): `bg-raised` is not a real Tailwind utility in this codebase.**
     `toast.tsx` line 40 uses `className="... bg-raised px-4 py-3 ..."`. Grepping the
     repository, `app/globals.css:13` defines `--color-bg-raised: #ffffff` and every other
     component that wants this background correctly uses the `bg-bg-raised` utility
     (`candidate-card.tsx`, `trust-badge.tsx`, `candidate-detail-actions.tsx`,
     `zona-autocomplete.tsx`, `candidate-filters.tsx`, etc. — a dozen+ call sites). Tailwind
     v4 has no built-in `bg-raised` utility and this codebase never defines a bare `raised`
     color token (only `--color-bg-raised`), so `bg-raised` is silently dropped at build
     time — no lint/typecheck/build error, since it's a valid-looking but inert class name,
     not a syntax error. The practical effect: the toast div has no background color at all,
     so it renders as bare unstyled text floating over whatever page content is behind it,
     with no `elevation-2` card to visually anchor it. This directly undercuts the intent of
     Round 1 Required Change #1 (a toast that reads as an obvious, high-contrast
     confirmation) and was independently flagged by Visual QA round 2. **Required fix:**
     change `bg-raised` to `bg-bg-raised` on line 40 of `components/shared/toast.tsx`.
   - The `try/catch` around `await toggleFavoriteAction(...)` (Round 1 Required Change #3,
     non-blocking) was also added: on a thrown error it reverts to `!next` (the pre-toggle
     state) and shows the same generic error toast, rather than leaving the optimistic UI
     stuck. `tests/components/familia/favorite-toggle.test.tsx`'s new "reverts the optimistic
     toggle and shows a visible error toast when the server action throws" test
     (`toggleFavoriteAction.mockRejectedValue(new Error("network error"))`) genuinely
     exercises this path and asserts the button returns to its pre-toggle `aria-pressed`
     state plus a visible (non-`sr-only`) alert toast. Confirmed correct by reading the
     code: `catch { setIsFavorite(!next); setToast({...}); }` — reverts to the state before
     the optimistic flip, which is correct since `next` was the value being (unsuccessfully)
     applied.

2. **`.eq("estado", "activa")` scoping (Required Change #2) — fixed correctly, and the
   safety concern the developer raised (closed-necesidad favorite/unfavorite must stay
   blocked) is genuinely enforced, not just cosmetically.**
   - `app/familia/favoritas/page.tsx`'s necesidades query no longer filters on `estado`,
     confirmed by reading the query and its comment ("Intentionally not scoped to
     `estado = 'activa'`..."). Closed-necesidad favorites now appear, grouped and sorted
     after active-necesidad groups (`buildGroups`'s `.sort((a, b) => Number(a.isClosed) -
     Number(b.isClosed))`), with a muted `"Necesidad cerrada"` label, `text-ink-400` heading,
     `opacity-70` card grid, and no "Ver candidatas" link — a real visual de-emphasis, not
     just a class added without effect (confirmed by reading the JSX conditionals directly).
   - Critically, the closed-necesidad `CandidateCardData` objects are built with
     `necesidadId: isClosed ? undefined : necesidad.id` (`buildGroups`, favoritas/page.tsx
     line ~107) — this is not a display-only dimming, it structurally removes the
     `necesidadId` the toggle/link need to function. `CandidateCard` (read in full) branches
     on `candidate.necesidadId` truthiness: when absent, it renders a `disabled` button
     (real HTML `disabled` attribute, not just an opacity class) with `pointer-events-none`
     for both the heart toggle and "Ver perfil" link, so there is no way for a user to
     trigger a favorite/unfavorite action against a closed necesidad from this UI — the
     interactive `FavoriteToggle` component is never mounted for those cards at all.
   - This matches the RPC's actual behavior: `set_candidate_favorite`'s ownership/activity
     check (`familia_id = p_familia_id and estado = 'activa'`) runs unconditionally before
     the `if p_favorite then` branch (confirmed by re-reading the unchanged migration file
     and re-confirming, structurally, that the check precedes the branch — the same
     invariant `tests/db/candidate-favorites-migration.test.ts`'s new regex-based test
     enforces), so even a hypothetical direct-RPC-call bypass of the UI would still be
     rejected server-side for both the favorite and unfavorite directions on a closed
     necesidad. The migration file itself is byte-for-byte unchanged from round 1 (confirmed
     by diffing today's read against round 1's cited RPC body), so round 1's live DB
     validation of this exact RPC logic still applies; no new DB-level regression risk was
     introduced by this round's page-level query change.
   - The developer's choice to keep closed-necesidad favorites read-only rather than, say,
     silently degrading the toggle to a no-op is the safer of the two options and is
     correctly and explicitly tracked as an E6 follow-up in `agent/BACKLOG.md` ("Known
     limitation, tracked for E6: favoriting/unfavoriting a candidate under a closed
     necesidad..."), rather than being silently left implicit. This satisfies Required
     Change #2's "or record an explicit decision" alternative in addition to actually fixing
     the underlying disappearing-favorites bug, which is the stronger of the two acceptable
     outcomes.

3. **Minor Issue #1 (unreachable disabled-card branch) — closed.** `candidate-card.tsx`
   gained a `disabledReason?: string` prop, and `favoritas/page.tsx`'s closed-necesidad path
   is now a real caller (`disabledReason: isClosed ? "necesidad cerrada" : undefined`),
   confirmed by reading both files. The branch is no longer dead code and is exercised by
   `tests/app/familia-favoritas.test.tsx` (not re-read line-by-line this round, but the
   `disabledReason` prop threading was confirmed structurally at the two call sites).

4. **Minor Issue #2 (weak string-match migration test) — closed.**
   `tests/db/candidate-favorites-migration.test.ts` was rewritten to use targeted regex
   assertions over the function body's structure (ownership-check-precedes-branch ordering,
   `on conflict` set-clause exclusions, favorite-branch-only eligibility checks, unfavorite's
   update statement) rather than plain substring `.toContain()` calls — read in full above;
   these assertions would genuinely fail if the claimed structural properties changed (e.g.
   the ownership check moving inside a branch, or a snapshot column leaking into the
   `on conflict` update), which is a real improvement over round 1's version. Still a
   source-text check rather than an executed-behavior test (the developer's own comment in
   the file acknowledges this), but that's an accepted, reasonable trade-off given
   `scripts/test-e4-04-favorites.sql` already covers real execution — satisfies Required
   Change #4's "or drop it" bar by making it worth keeping.

## Round 2 — Validation Performed Independently

- `npm run lint` — clean.
- `npm run typecheck` — clean (`next typegen && tsc --noEmit`).
- `npm test -- --run` — **272 tests passed (40 files)**, matching the developer's reported
  count.
- `npm run build` (`next build`) — compiled and generated successfully, all routes
  (including `/familia/favoritas`) built without error.
- `npm run check:secrets` — OK, no server-only secret exposed client-side.
- **`npm run test:db` — not independently re-executed this round.** Multiple concurrent
  `supabase start`/`npm run test:db` invocations from other agents re-reviewing this same
  story (Functional QA round 2) were running in parallel against the same local Docker
  daemon, causing repeated container/port contention and stalled image pulls across several
  attempts (confirmed via `ps`/`docker ps` — no `supabase_db_nanamex` container ever reached
  a healthy state across ~15 minutes of retries). Per the coordinator's explicit
  instruction, further troubleshooting was stopped after this and this round's DB
  correctness claim instead rests on **source-level verification**: (a) the migration file
  `db/migrations/20260903000013_candidate_favorites.sql` is byte-for-byte unchanged from
  round 1, where it was already executed live against a freshly-reset local Postgres via
  `scripts/test-e4-04-favorites.mjs`/`.sql` and confirmed to exit 0 with all seven behavioral
  assertions genuinely exercising their claims (wrong-owner rejection, unpublished-candidate
  rejection, frozen-snapshot creation/non-re-freeze, unfavorite semantics) — that live
  validation still applies unchanged; (b) this round's only DB-adjacent change is
  `favoritas/page.tsx`'s query filter removal, which is a `select`-side change with no new
  RPC/migration logic, and was verified by reading the query and `buildGroups` directly
  (see Round 2 item 2 above) rather than by execution; (c) the new/strengthened
  `tests/db/candidate-favorites-migration.test.ts` regex assertions were read and confirmed
  to structurally match the (unchanged) migration file. This is a real, if incomplete,
  substitute for a live run — it does not newly execute Postgres this round, but nothing in
  this round's diff touches RPC/trigger/constraint logic that round 1's live run didn't
  already cover. **Recommend an actual `npm run test:db` run once Docker contention clears**
  (e.g. as part of closing out this review cycle) as a belt-and-suspenders check, but this is
  not expected to surface anything new given (a)-(c) above.
- Independently confirmed the toast visibility and try/catch-revert behavior by reading
  `components/shared/toast.tsx`, `components/familia/favorite-toggle.tsx`, and
  `tests/components/familia/favorite-toggle.test.tsx` in full (see Round 2 item 1 above),
  and confirmed the closed-necesidad UI disabling by reading `app/familia/favoritas/page.tsx`
  and `components/familia/candidate-card.tsx` in full (see Round 2 item 2 above).
- Confirmed the `bg-raised` defect by grepping the repository for every `bg-raised`/
  `bg-bg-raised`/`--color-bg-raised` occurrence: `app/globals.css:13` is the only place
  `--color-bg-raised` is defined, and every other component (`candidate-card.tsx`,
  `trust-badge.tsx`, `candidate-detail-actions.tsx`, `zona-autocomplete.tsx`,
  `candidate-filters.tsx`, `perfil-familiar-form.tsx`, `necesidad-wizard.tsx`,
  `role-select-buttons.tsx`) consistently uses `bg-bg-raised`; `toast.tsx` is the sole
  outlier using the non-existent `bg-raised`. Also independently checked
  `shadow-elevation-2` (the same file's other new utility) against `app/globals.css:69`'s
  `--shadow-elevation-2` definition — that one is correctly wired and not affected.

## Round 2 — Updated Acceptance Criteria

| Criterion | Round 1 | Round 2 |
|---|---|---|
| Favorite/unfavorite gives visible toast feedback per UI-SYSTEM.md §5.6's named "favorited" use case | FAIL | FAIL — toast is implemented and structurally correct (positioning, timing, icon+message, both success/failure), but renders with no background fill due to the `bg-raised` typo, which is a real visibility regression against the same acceptance criterion this round exists to close |
| FAM-07 shows saved niñeras "across all necesidades" (screen-inventory.md), not just active ones | FAIL | PASS |
| Closed-necesidad favorites cannot be favorited/unfavorited from the UI, and the RPC independently rejects any such attempt server-side | (not previously assessed — dormant) | PASS |
| `candidate-card.tsx`'s disabled-placeholder branch has a real caller and is exercised | (Minor Issue, not a criterion) | PASS |
| Migration test asserts real structural properties rather than plain substring matches | (Minor Issue, not a criterion) | PASS |

All other Round 1 acceptance criteria (paywall-free favoriting, server-derived family id,
RPC-level defense-in-depth, frozen-snapshot semantics, shared card component, grouping,
empty state, no E5/E9 leakage, dashboard nav entry) are unchanged by this round's diff and
remain PASS — re-confirmed not to have regressed by this round's full test suite passing and
by reading the unchanged files.

## Round 2 — Required Changes

1. **Blocking.** Fix `components/shared/toast.tsx` line 40: change `bg-raised` to
   `bg-bg-raised` so the toast actually renders with the `UI-SYSTEM.md` §5.6-specified
   `bg-raised`-token background instead of silently having no background fill. This is a
   one-line change; no other code in the diff needs to move.
2. **Recommended, non-blocking for this review but should happen before the story is
   declared fully closed.** Run `npm run test:db` once local Docker contention from
   concurrent agent runs clears, to get one genuine live-execution confirmation this round
   (source-level review found no reason to expect a different result, per the Validation
   section above, but an actual run is cheap and removes the residual uncertainty).

## Round 2 — Summary

Round 1's two blocking issues (invisible toast feedback, active-only Favoritas scoping) were
both fixed correctly and non-superficially: the toast is a real, positioned, timed,
icon+message component wired to both success and failure paths with genuine test coverage of
its visibility, the closed-necesidad favorites bug is fixed by including those favorites
while correctly and safely disabling interaction on them (verified both client-side via
`disabled` attributes/omitted `necesidadId` and server-side via the unconditional RPC
ownership check), and both minor issues were closed as requested. The story remains at
REVISE only because of one new, narrow, easily-fixed defect introduced by the toast
implementation itself: `bg-raised` is not a real Tailwind utility in this codebase (the
correct class is `bg-bg-raised`), so the toast currently has no visible background — a defect
that direct source inspection here confirms independently of Visual QA's finding. Once that
one line is corrected, this reviewer would expect a PASS on resubmission, assuming a
follow-up live `npm run test:db` run (recommended, not blocking) turns up nothing new.

---

# Round 3

## Verdict (Round 3)

**PASS**

Round 2's sole blocking finding — the `bg-raised` typo silently dropping the toast's
background fill — is fixed correctly, and the two accompanying minor Visual QA cleanups
(the redundant `opacity-70` wrapper on closed-necesidad card grids, and alignment classes on
the disabled "Ver perfil" placeholder) are both present and correct at the source level. No
new defects were introduced by these changes. The full validation suite (lint, typecheck,
272 unit tests, `check:secrets`, `next build`, and this round's live `npm run test:db`) all
pass cleanly. This closes out the review loop for E4-04 at PASS.

## Round 3 — Verification of Round 2's Required Changes

1. **`bg-raised` → `bg-bg-raised` (blocking) — fixed correctly.**
   `components/shared/toast.tsx` line 40 now reads:
   `className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-2 rounded-sm bg-bg-raised
   px-4 py-3 text-body-sm shadow-elevation-2 sm:inset-x-auto sm:left-4 sm:w-80"` — confirmed
   by reading the file directly. `bg-bg-raised` is the real utility consumed everywhere else
   in this codebase (`candidate-card.tsx`, `trust-badge.tsx`, `candidate-detail-actions.tsx`,
   etc.) and maps to `--color-bg-raised: #ffffff` in `app/globals.css:13`, so the toast now
   has a genuine background fill and `shadow-elevation-2` card behind its text/icon, closing
   the visibility regression Round 2 found. Independently confirmed via Visual QA Round 3's
   VERIFIED verdict (per the coordinator), which is consistent with this source-level check.

2. **Redundant `opacity-70` wrapper on closed-necesidad card grids — removed correctly, and
   the resulting opacity math is now correct (not compounded).**
   `app/familia/favoritas/page.tsx`'s closed-necesidad card grid
   (`<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">`, line 225)
   carries no `opacity-*` class at all — grepped the file directly, zero `opacity` matches.
   De-emphasis for a closed necesidad is now achieved solely through: (a) the group heading's
   `text-ink-400` class plus a muted "Necesidad cerrada" caption (lines 215–217), and (b) each
   individual disabled control inside `CandidateCard` (the disabled heart button and disabled
   "Ver perfil" placeholder, both `opacity-40` in `candidate-card.tsx`). Since there is no
   longer an outer `opacity-70` wrapper multiplying against the inner `opacity-40` controls
   (0.7 × 0.4 ≈ 0.28, the compounding Round 2/Visual QA flagged), the disabled controls now
   render at their intended standalone ~40% opacity, matching the same disabled-state
   treatment used elsewhere in the app (e.g. the pre-existing disabled "Ver perfil" fallback
   this component already had). The photo/name/TrustBadge/MatchScore portions of a
   closed-necesidad card remain at full opacity, which is consistent with "de-emphasize the
   now-unusable actions, not the whole card's identity info" — a reasonable and now
   mathematically correct treatment.

3. **Alignment classes on the disabled "Ver perfil" placeholder — present and correct.**
   `components/familia/candidate-card.tsx`'s disabled "Ver perfil" fallback button (rendered
   when `candidate.necesidadId` is absent) now reads:
   `className="pointer-events-none min-h-11 inline-flex items-center text-button
   text-primary-600 opacity-40"` (line 116) — confirmed by reading the file directly. This
   matches the enabled `<Link>` variant's own alignment classes
   (`className="min-h-11 inline-flex items-center text-button text-primary-600"`, line 108)
   exactly, aside from the disabled-only `pointer-events-none opacity-40`, so the two variants
   now align identically within the card footer regardless of which one renders — closing the
   alignment inconsistency Visual QA flagged.

## Round 3 — Validation Performed Independently

- `npm run lint` — clean.
- `npm run typecheck` (`next typegen && tsc --noEmit`) — clean.
- `npm test -- --run --no-file-parallelism` — **272 tests passed (40 files)**, same count as
  Round 2, confirming no regression and no missing test updates for this round's changes
  (all three fixes are CSS-class-only; no new behavior needed new test coverage, and none of
  the existing assertions broke).
- `npm run check:secrets` — OK, no server-only secret exposed client-side.
- `npm run build` (`next build`) — compiled and generated successfully; `/familia/favoritas`
  (and all other routes) built without error.
- `npm run test:db` — **run live and completed successfully this round** (exit code 0), no
  Docker contention this time (a different, unrelated project's Supabase stack was running
  on the host but on a disjoint port range — `nanamex`'s `supabase/config.toml` uses the
  55320s, the other project's containers used the default 543xx range — so `npx supabase
  start` for `nanamex` came up cleanly with no port conflict). The full chain — `supabase db
  reset --local && node scripts/test-necesidad-rpc.mjs && node
  scripts/test-e4-03-profile-view.mjs && node scripts/test-e4-04-favorites.mjs` — applied all
  migrations (including the unchanged `20260903000013_candidate_favorites.sql`) and executed
  all three probe scripts against a freshly reset local Postgres, exiting 0 overall. This
  resolves Round 2's outstanding "recommended, non-blocking" item of getting one genuine live
  execution confirmation this round; combined with Round 1's line-by-line reading of
  `scripts/test-e4-04-favorites.sql`'s seven assertions (still unchanged), the RPC-level
  correctness claims now have both a fresh live run and a fully-read assertion set behind
  them.
- Confirmed via `git status --short` that `components/shared/toast.tsx`,
  `app/familia/favoritas/page.tsx`, and `components/familia/candidate-card.tsx` remain the
  only files touched by this round's fixes (plus the pre-existing untracked
  `test-invoice-generator` deletions and `.claude/settings.json`, which are unrelated
  working-tree state, not part of this story's diff, consistent with Rounds 1–2's notes).

## Round 3 — Updated Acceptance Criteria

| Criterion | Round 2 | Round 3 |
|---|---|---|
| Favorite/unfavorite gives visible toast feedback per UI-SYSTEM.md §5.6's named "favorited" use case | FAIL (`bg-raised` typo, no background fill) | PASS — `bg-bg-raised` confirmed at the source, toast renders with a real elevated card background |
| Closed-necesidad cards' disabled controls de-emphasize at the correct, non-compounded opacity | (not previously assessed as a criterion — introduced as a Visual QA finding this round) | PASS |
| Disabled "Ver perfil" placeholder aligns with the enabled variant | (not previously assessed as a criterion — introduced as a Visual QA finding this round) | PASS |

All other Round 1/Round 2 acceptance criteria (paywall-free favoriting, server-derived family
id, RPC-level defense-in-depth, frozen-snapshot semantics, shared card component, grouping,
empty state, no E5/E9 leakage, dashboard nav entry, across-all-necesidades scoping,
closed-necesidad interaction blocking, disabled-branch test coverage, migration test rigor)
are unchanged by this round's diff (CSS-class-only fixes) and remain PASS, re-confirmed by
this round's full test suite and live `test:db` run passing with no regressions.

## Round 3 — Required Changes

None. No further changes required for this story.

## Round 3 — Summary

All three fixes from this round — the `bg-raised` → `bg-bg-raised` correction, removal of the
redundant/compounding `opacity-70` wrapper on closed-necesidad card grids, and the alignment
classes added to the disabled "Ver perfil" placeholder — were verified directly at the source
and are all correct, minimal, and free of new defects. Combined with a clean run of the full
validation suite (lint, typecheck, 272/272 tests, `check:secrets`, `next build`) and, this
round, a genuinely executed `npm run test:db` (no environment fallback needed this time), and
Visual QA Round 3's independent VERIFIED verdict, E4-04 (FAM-07 Favoritas) is approved at
**PASS**. This closes the review loop for this story within the maximum of 3 rounds.
