# Visual QA — E4-04 (FAM-07 "Favoritas")

Reviewed on branch `nanamex/e4-03-fam06-candidate-detail` with E4-04's uncommitted working-tree
changes on top (favorite-toggle.tsx, actions/favorites.ts, app/familia/favoritas/page.tsx,
candidate-card.tsx, candidate-detail-actions.tsx, [ninId]/loading.tsx, [ninId]/page.tsx,
app/familia/page.tsx).

## Environment note

No browser/screenshot tooling available in this environment (same limitation as prior Visual
QA rounds in this project, e.g. E2-03/E4-03). This is a **source-level review**: Tailwind
classes, breakpoints, and component structure were traced by hand against
design/UI-SPEC.md, design/UX-spec.md, and design/UI-SYSTEM.md at the requested breakpoints
(375/430/768/1440px), not rendered/screenshotted.

## Files reviewed

- `components/familia/favorite-toggle.tsx`
- `components/familia/candidate-card.tsx`
- `components/familia/candidate-detail-actions.tsx`
- `app/familia/favoritas/page.tsx`
- `app/familia/necesidad/[id]/candidatas/[ninId]/loading.tsx`
- `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`
- `app/familia/page.tsx`

## Findings

### V01 — No toast feedback on favorite/unfavorite, despite UI-SYSTEM naming this exact action as a toast use case
- **Severity:** Major
- **Viewport:** all (375/430/768/1440)
- **Screen:** FAM-04 candidate card, FAM-06 candidate detail, FAM-07 favoritas
- **Expected:** design/UI-SYSTEM.md §5.6 "Feedback: toasts, banners, inline validation"
  explicitly lists **"Toast (favorited, reported, saved)"** as the product's toast pattern —
  bottom-anchored (mobile) / bottom-left (desktop), icon + message, `elevation-2`,
  auto-dismiss 4s. Favoriting/un-favoriting a candidate is the named example.
- **Actual:** `FavoriteToggle` (components/familia/favorite-toggle.tsx) has no toast at all.
  The only feedback is the heart icon's own fill/color flip (optimistic), and on failure a
  silent revert plus an `sr-only` `role="alert"` message (`<span role="alert"
  className="sr-only">{error}</span>`, line 60) that is invisible to sighted users. There is
  no `Toast`/`sonner` usage anywhere in the codebase yet (confirmed via grep), so this is the
  first story to actually need the pattern the design system already specified for it.
- **Reproduction:** Read `components/familia/favorite-toggle.tsx` lines 24-63; grep the repo
  for `toast`/`sonner` in `components/`/`app/` — no matches outside tests.
- **Judgment on Developer's flagged question:** sr-only-only error messaging is **not
  sufficient** here as the sole signal. A sighted user who taps the heart, sees it fill, then
  watches it silently un-fill a moment later (on a failed request) has no visible explanation
  — this reads as a broken/flaky toggle, not a handled error. At minimum, add a visible error
  toast/inline message on failure (matching the danger-toast token already defined in
  UI-SYSTEM §5.6/§3.3) even if the success case is deferred. Recommend also adding the
  success toast the spec names, for parity with "reported"/"saved" elsewhere in the product,
  but the error case is the one that actually risks confusing/misleading users and should
  block sign-off harder than the missing success toast.

### V02 — Empty-state CTA label doesn't match UI-SPEC wording
- **Severity:** Minor
- **Viewport:** all
- **Screen:** FAM-07 Favoritas, empty state
- **Expected:** design/UI-SPEC.md FAM-07: "Empty state: 'Aún no has guardado ninguna
  niñera' + button to the first active necesidad's FAM-04." The headline copy is specified
  verbatim; the button's destination (FAM-04, i.e. the candidate list for that necesidad) is
  specified, but not an exact label.
- **Actual:** Headline copy matches exactly ("Aún no has guardado ninguna niñera",
  app/familia/favoritas/page.tsx line 61). Button label is "Ver candidatas" and links to
  `/familia/necesidad/${firstActive.id}` (the necesidad detail/FAM-04 host route), which is
  functionally correct. Flagging only because the spec's own wording for this button
  elsewhere in the app (necesidad detail page's own empty state, `app/familia/necesidad/[id]/page.tsx`)
  should be checked for consistency — not verified as identical, so noting as a minor
  consistency check rather than a defect. No action required unless another screen uses
  different wording for the same destination.
- **Reproduction:** Compare `app/familia/favoritas/page.tsx` lines 169-179 against any other
  "go to FAM-04" CTA in the app.

### No issues found: touch targets
- `FavoriteToggle`'s default class (`h-11 w-11`, i.e. 44x44px) is used both on the card
  (candidate-card.tsx line 95, and disabled-placeholder fallback at line 95) and in both
  detail-actions placements (candidate-detail-actions.tsx lines 26 and 37, `h-11 w-11`).
  Matches this project's established 44px touch-target convention (per E2-03's prior
  finding). No regression.

### No issues found: FAM-07 grid/card consistency with FAM-04
- FAM-07's grid classes (`app/familia/favoritas/page.tsx` line 193:
  `grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3`) are byte-identical to FAM-04's
  necesidad-detail candidate grid (`app/familia/necesidad/[id]/loading.tsx` line 19, same
  classes used by the live page). `CandidateCard` is reused verbatim (no FAM-07-specific
  variant), satisfying "same card component as FAM-04." Grouping-by-necesidad uses a plain
  `<h2>` group label + "Ver candidatas" link per group, which reads as a clear structural
  header without introducing new card-level chrome.

### No issues found: loading skeleton / real content layout shift
- `ActionsSkeleton` in `[ninId]/loading.tsx` (lines 7-20) mirrors the real
  `CandidateDetailActions` markup dimensionally: same `mt-6 hidden gap-3 lg:flex` wrapper,
  same `h-11 w-11` skeleton block for the toggle slot and `h-11 flex-1` for the button slot on
  desktop; same `fixed inset-x-0 bottom-0 ... px-4 py-3` sticky mobile bar with matching
  `h-11 w-11 shrink-0` / `h-11 flex-1` blocks, including the same `data-testid=
  "candidate-mobile-actions"` used by the real component. This avoids the class of
  layout-shift issue E4-03's V03 finding caught — the skeleton occupies the same box model as
  the resolved content, so swapping in the real `FavoriteToggle` (also `h-11 w-11`) should not
  reflow the page.

### No issues found: FAM-02 dashboard entry point
- New "Favoritas" nav link (`app/familia/page.tsx` line ~146) uses `min-h-11` and sits
  alongside the existing "Crear necesidad" primary CTA in the same header row, consistent
  with the existing header pattern (`flex flex-wrap items-center gap-4`) — no divergent
  one-off styling.

## Verdict

**REVISION_REQUIRED** — V01 (missing visible error feedback for the favorite-toggle's
optimistic-update failure path, despite the design system explicitly specifying a toast
pattern for exactly this action) should be addressed before this story is marked VERIFIED.
V02 is advisory only and does not block.

---

# Round 2

Reviewed on branch `nanamex/e4-03-fam06-candidate-detail` with E4-04's round-2 changes:
new `components/shared/toast.tsx`, `favorite-toggle.tsx` wiring it into both success/error
paths, `--shadow-elevation-2` added to `app/globals.css`, `app/familia/favoritas/page.tsx`'s
closed-necesidad de-emphasis treatment, and the new `disabledReason` prop on
`components/familia/candidate-card.tsx`.

## Environment note

Browser/screenshot tooling is still unavailable. Unlike round 1, this round's central claim
(does the toast actually render visibly?) is a rendering question, not just a class-reading
one, so I additionally ran this project's real `next build` (Tailwind v4/`@tailwindcss/postcss`,
this repo's actual `app/globals.css` `@theme` tokens) and inspected the generated CSS output
in `.next/static/chunks/*.css` to check which Tailwind utility classes actually exist and
what they compile to. This is still not a rendered screenshot, but it is stronger evidence
than reading source classes by eye, and it is how V01(b) below was actually caught — reading
`toast.tsx` alone would not have surfaced it.

## Files reviewed

- `components/shared/toast.tsx` (new)
- `components/familia/favorite-toggle.tsx` (updated)
- `app/globals.css` (`--shadow-elevation-2` addition)
- `app/familia/favoritas/page.tsx` (closed-necesidad de-emphasis)
- `components/familia/candidate-card.tsx` (`disabledReason` prop, disabled placeholder controls)
- `design/UI-SYSTEM.md` §5.1, §5.6, §5.9 (component/token spec)
- Generated CSS: `.next/static/chunks/1rmqh9faqpvzr.css` (from a clean `npm run build`)

## Findings

### V01 — RESOLVED (mechanism) / REOPENED (implementation bug): toast has no visible background — `bg-raised` is not a real Tailwind class in this codebase
- **Severity:** Major
- **Viewport:** all (375/430/768/1440)
- **Screen:** FAM-04 candidate card, FAM-06 candidate detail, FAM-07 favoritas — everywhere `FavoriteToggle` is used
- **Expected:** design/UI-SYSTEM.md §5.6: "Toast ... `bg-raised` with `elevation-2`" — a
  solid raised-surface background box with a drop shadow, containing the icon + message.
- **Actual:** `components/shared/toast.tsx` line 40 uses the literal Tailwind class
  `bg-raised`:
  ```
  className="fixed inset-x-4 bottom-4 z-50 flex items-center gap-2 rounded-sm bg-raised px-4 py-3 text-body-sm shadow-elevation-2 sm:inset-x-auto sm:left-4 sm:w-80"
  ```
  This class does not exist anywhere else in the codebase and does not exist in the compiled
  output. Every other component in this project that wants this exact background token uses
  `bg-bg-raised` (e.g. `candidate-card.tsx` line 76, `candidate-detail-actions.tsx` line 30,
  `trust-badge.tsx` lines 40/83, `app/familia/page.tsx` lines 92/117, `candidate-filters.tsx`
  multiple lines, `app/familia/favoritas/page.tsx`'s own `EmptyState` at line 59) — because
  Tailwind v4 generates the utility name from the full `@theme` key
  `--color-bg-raised` (`app/globals.css` line 13), stripping only the `--color-` prefix, which
  yields the color name `bg-raised` and therefore the *background* utility `bg-` + `bg-raised`
  = `bg-bg-raised`. `bg-raised` alone is not a generated utility.
  I confirmed this directly by running this project's own `next build` and grepping the
  emitted CSS bundle:
  - `.bg-bg-raised{background-color:var(--color-bg-raised)}` — present (used by every other
    component).
  - No `.bg-raised{...}` rule exists anywhere in the compiled CSS at all.
  Tailwind v4 silently drops unrecognized utility class names (no build error, no warning) —
  which is exactly why this shipped a full round without being caught by lint/typecheck/build.
  **Visual impact:** the toast box renders with a shadow (`shadow-elevation-2` *is* a real,
  correctly-generated utility — confirmed present in the compiled CSS) and rounded corners,
  but no fill color at all — the container is fully transparent. The icon and message text sit
  directly on top of whatever is behind the toast (the page content scrolled underneath it,
  since it's `fixed`), with only a shadow outline suggesting a box is there. This does not read
  as "no toast" (round 1's original defect) but it does not read as the specified `bg-raised`
  card either — it reads as a rendering glitch: a shadow floating in space with text inside it,
  no defined edges/fill, and unpredictable/likely-poor contrast depending on what page content
  happens to be scrolled underneath at the moment it appears. This is not a cosmetic nitpick —
  a floating, edgeless, see-through toast box is a plausible "is this broken?" moment for a
  real user, and it fails the letter of §5.6's spec (`bg-raised`) as directly as the missing
  sr-only-only toast failed it in round 1, just via a different failure mode (wrong Tailwind
  class rather than no toast at all).
- **Reproduction:**
  1. Read `components/shared/toast.tsx` line 40 — `bg-raised` (not `bg-bg-raised`).
  2. From `projects/nanamex/`, run `npm run build`, then
     `grep -o '\.bg-bg-raised{[^}]*}' .next/static/chunks/*.css` (present) vs.
     `grep -oE '\.bg-raised\{[^}]*\}' .next/static/chunks/*.css` (no output — class doesn't exist).
  3. Cross-reference `app/globals.css` line 13 (`--color-bg-raised: #ffffff;`) against any of
     the ~15 other call sites in this codebase that correctly use `bg-bg-raised` for the same
     token.
- **Fix:** change `bg-raised` to `bg-bg-raised` on line 40 of `components/shared/toast.tsx`.
  One-character-class fix; everything else about the component (positioning, icon, variant
  colors, auto-dismiss, `role="alert"`/`role="status"`, `shadow-elevation-2`) is correct and
  does not need to change.
- **Status:** the *mechanism* half of round 1's V01 (no toast component, no wiring, silent
  sr-only-only failure feedback) is genuinely fixed — a real `Toast` component now exists,
  is wired for both success and failure in `favorite-toggle.tsx`, and is the first real
  consumer of the shared component intended to also serve "reported"/"saved" later. But the
  *rendering* half regressed to a new, different visible-toast bug. Net: **V01 is not yet
  fully resolved** and blocks sign-off again, for a materially smaller reason than round 1
  (one wrong class name vs. no component at all).

### V01 sub-checks that did pass
- **Positioning vs. §5.6 ("bottom-anchored mobile / bottom-left desktop"):** correct.
  `fixed inset-x-4 bottom-4` at the default (mobile) breakpoint is a full-width bottom bar
  with 16px side margins — reasonable "bottom-anchored" at 375/430px. At `sm:` (640px) and
  above (so both the 768px tablet and 1440px desktop viewports requested), it switches to
  `sm:inset-x-auto sm:left-4 sm:w-80` — anchored bottom-left at a fixed 320px width. This
  correctly satisfies "bottom-left (desktop)" at both 768 and 1440. Treating "sm and up" as
  desktop-style for this component is a reasonable choice; nothing else in this project ties
  the toast to a stricter breakpoint (e.g. `lg`), so there's no established convention this
  contradicts.
- **Auto-dismiss 4s:** `durationMs = 4000` default, `setTimeout`, cleared on unmount/re-render
  — matches spec, and per-toggle-click `toast` state means only one `Toast` is ever mounted
  at a time (satisfies "max one visible at a time... new toast replaces, doesn't stack" since
  a second click before the timer fires just replaces the state value, not the DOM node
  count).
- **`elevation-2`:** the new `--shadow-elevation-2: 0 8px 24px rgba(36, 31, 25, 0.12)` token
  in `app/globals.css` matches design/UI-SYSTEM.md's elevation table (`0 8px
  24px rgba(36,31,25,0.12)`) exactly, and the compiled CSS confirms `shadow-elevation-2` is a
  real, correctly generated utility (`.shadow-elevation-2{--tw-shadow:0 8px 24px
  var(--tw-shadow-color,#241f191f); ...}` — the hex+alpha suffix `#241f191f` is Tailwind's own
  color-mix encoding of the same rgba value, not a discrepancy).
- **Icon + message, single line, success/error distinctness:** success uses `CheckCircle`
  filled `text-primary-600` + `text-ink-900` message text; error uses `WarningCircle` filled
  `text-danger-600` + `text-danger-600` message text, and `role="alert"` (error) vs.
  `role="status"` (success) — the two states are visually and semantically distinct, and the
  error variant's icon+text both taking the danger hue reads as clearly more urgent than
  success's neutral-ink message text. No concerns here once the background fill above is
  fixed.
- **Copy:** "Guardada en favoritas" / "Quitada de favoritas" (success) and a specific
  server message or "No se pudo actualizar la favorita." (error fallback) are short,
  single-line, and match the sentence-case tone used elsewhere in the app.

### V03 — Compounding opacity makes closed-necesidad disabled controls fall below the project's own 40%-disabled convention
- **Severity:** Minor
- **Viewport:** all (most visible at any width, since it's an opacity/contrast issue, not a
  layout one)
- **Screen:** FAM-07 Favoritas, closed-necesidad groups
- **Expected:** design/UI-SYSTEM.md §5.1: "Disabled: 40% opacity, no pointer events." This is
  the project's one documented disabled-state convention, and `candidate-card.tsx`'s disabled
  heart/`Ver perfil` placeholders correctly apply `opacity-40` individually (this matches the
  convention on its own, e.g. as already used for the pre-existing "no necesidad context"
  placeholder case).
- **Actual:** `app/familia/favoritas/page.tsx` line 225 additionally wraps the *entire card
  grid* for a closed group in `opacity-70` (`` `mt-4 grid grid-cols-1 gap-4 md:grid-cols-2
  xl:grid-cols-3 ${group.isClosed ? "opacity-70" : ""}` ``). CSS `opacity` compounds
  multiplicatively on nested elements, so the disabled heart icon and disabled "Ver perfil"
  text inside a closed group render at an effective 0.7 × 0.4 = **28% opacity**, not the
  documented 40%. Meanwhile the rest of the card's content (avatar, name, trust badge, match
  score) is only affected by the single 70% wrapper opacity, so it stays comfortably legible
  — the disabled controls end up noticeably fainter than everything else on the same
  de-emphasized card, to the point of being hard to perceive as "a button" versus a rendering
  artifact, which works against the "reads as intentionally closed/archived, not broken" goal
  this round was specifically checking for.
- **Reproduction:** Read `app/familia/favoritas/page.tsx` line 225 (`opacity-70` wrapper) together
  with `components/familia/candidate-card.tsx` lines 101 and 112 (`opacity-40` on the disabled
  heart button and disabled "Ver perfil" button respectively) — both apply to the same DOM
  subtree for every card in a closed group.
- **Fix suggestion:** pick one opacity treatment, not both — either dim only the group's
  static/context chrome (label, "Necesidad cerrada" caption — already handled separately via
  `text-ink-400`, which is *not* inside the `opacity-70` wrapper and is unaffected) and leave
  card opacity at 100% with just the individual `opacity-40` disabled controls doing the
  "closed" signaling, or keep the whole-grid `opacity-70` but drop the redundant per-control
  `opacity-40` inside a closed group specifically (they're already inside a dimmed region).
  Not blocking on its own, but worth fixing since it directly undermines this round's "reads
  as intentional, not broken" goal and deviates from the one disabled-opacity number the
  design system actually specifies.

### V04 — Disabled "Ver perfil" placeholder lacks the enabled version's sizing/alignment classes
- **Severity:** Minor
- **Viewport:** all
- **Screen:** FAM-07 Favoritas (closed groups) and any other `CandidateCard` render with no `necesidadId`
- **Expected:** Visually consistent sizing/vertical alignment between a control's enabled and
  disabled states, so a group of otherwise-identical cards (some active, some closed) doesn't
  visibly jump in internal alignment.
- **Actual:** the enabled "Ver perfil" link (`candidate-card.tsx` line 108) is
  `min-h-11 inline-flex items-center text-button text-primary-600`; the disabled placeholder
  (line 112) is only `pointer-events-none text-button text-primary-600 opacity-40` — missing
  `min-h-11 inline-flex items-center`. Since `pointer-events-none` already makes the 44px
  touch-target requirement moot for this control (it isn't interactive), this is not a touch-
  target defect, but the disabled version will sit shorter/baseline-aligned differently than
  the enabled version within the same `flex items-center justify-between` footer row next to
  the 44px-tall heart button beside it, so a closed-group card's footer will look subtly
  misaligned compared to an active-group card's footer.
- **Reproduction:** Compare `candidate-card.tsx` lines 108 and 112 directly.
- **Fix suggestion:** add `min-h-11 inline-flex items-center` to the disabled button for
  parity, purely for visual consistency (no functional impact since it's non-interactive).

### No issues found: closed-necesidad de-emphasis reads as "closed," not "broken," structurally
- Group header: muted `text-ink-400` on the `<h2>` (not affected by the grid's `opacity-70`,
  since the label sits outside that wrapper) plus an explicit "Necesidad cerrada" caption —
  this alone, before any card-level dimming, already unambiguously communicates the group's
  state in text, which is the more important signal than the opacity treatment itself.
- Sorting: `buildGroups` sorts active groups before closed groups (`Number(a.isClosed) -
  Number(b.isClosed)`), so a family with both active and closed favorites sees active ones
  first — closed/archived content pushed down, matching the "archived" mental model.
- No dead "Ver candidatas" link is rendered for closed groups (correctly omitted per the
  redirect-away behavior on FAM-04 for non-`activa` necesidades) — avoids a worse UX bug
  (a link that silently bounces the user back).
- `disabledReason` is threaded into both the `title` attribute and an `sr-only` span on each
  disabled control (`Guardar favorita (necesidad cerrada)` / `Ver perfil (necesidad cerrada)`)
  — appropriately specific per-card explanation of *why* the control is disabled, an
  improvement over a generic disabled state with no explanation.
- Card touch targets: the *functional* 44px heart-button convention is unaffected by this
  round's changes (still `h-11 w-11` per round 1's finding); only the two Minor items above
  (V03/V04) affect the disabled-state presentation specifically.

## Round 2 Verdict

**REVISION_REQUIRED** — V01 is not yet fully resolved. The Developer correctly built the
missing `Toast` component and wired it into both the success and failure paths (round 1's
core complaint — a sighted user getting no visible feedback at all, especially on failure —
is fixed), but the component's background class (`bg-raised`) does not exist in this
codebase's compiled Tailwind output, so the toast currently renders as a transparent,
edgeless box (shadow only) rather than the `bg-raised` solid card §5.6 specifies. This is a
one-line class-name fix (`bg-raised` → `bg-bg-raised`, matching every other call site in the
codebase and confirmed against the actual `next build` CSS output), not a design or
architecture problem, so it should be a fast turnaround — but it does mean the toast is still
not correctly visible today and should not be marked VERIFIED until fixed and re-checked.

V03 (compounding opacity on closed-necesidad disabled controls, landing at 28% instead of the
documented 40%) and V04 (disabled "Ver perfil" placeholder missing the enabled version's
alignment classes) are both Minor/cosmetic and do not need to block sign-off on their own, but
should be fixed alongside the V01 re-fix since they're small, same-file changes and directly
relevant to this round's explicit "does closed look intentional vs. broken" check.

V02 from round 1 (empty-state CTA label wording) remains advisory-only and unaddressed by this
round's changes; still non-blocking.

---

# Round 3 (final review cycle)

Reviewed on branch `nanamex/e4-03-fam06-candidate-detail` with the three round-2 fixes applied:
`components/shared/toast.tsx` (`bg-raised` → `bg-bg-raised`), `app/familia/favoritas/page.tsx`
(removed the redundant grid-level `opacity-70` wrapper on closed-necesidad groups), and
`components/familia/candidate-card.tsx` (disabled "Ver perfil" placeholder now includes
`min-h-11 inline-flex items-center`).

## Environment note

Browser/screenshot tooling is still unavailable. As in round 2, I ran this project's own
`next build` and inspected the freshly generated CSS in `.next/static/chunks/*.css` to confirm
the exact utility classes now in use actually compile to the intended rules, rather than only
reading source. This is source-level + compiled-output verification, not a rendered
screenshot.

## Files re-reviewed

- `components/shared/toast.tsx`
- `app/familia/favoritas/page.tsx`
- `components/familia/candidate-card.tsx`
- Generated CSS from a clean `npm run build` (`.next/static/chunks/*.css`)

## Re-verification of Round 2 findings

### V01 — RESOLVED: toast now has a real, correctly-generated background fill
- `components/shared/toast.tsx` line 40 now reads `bg-bg-raised` (not `bg-raised`).
- Confirmed against the compiled CSS: `grep -o '\.bg-bg-raised{[^}]*}' .next/static/chunks/*.css`
  returns `.bg-bg-raised{background-color:var(--color-bg-raised)}`, and a search for a bare
  `.bg-raised{...}` rule returns nothing (the broken class is fully gone from both source and
  output).
- `shadow-elevation-2` remains present and correctly generated (unchanged from round 2, already
  verified there).
- All other round-2 "passed" sub-checks (positioning, auto-dismiss timing, icon/message
  variants, copy) are unaffected by this one-class fix and still hold.
- **Verdict: fixed.** The toast now renders as a solid, edged, drop-shadowed card per
  design/UI-SYSTEM.md §5.6, not a transparent shadow-only box.

### V03 — RESOLVED: no more compounding opacity on closed-necesidad cards
- `app/familia/favoritas/page.tsx` line 225's card-grid wrapper is now
  `` `mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3` `` with no `isClosed`-conditional
  `opacity-70` (or any opacity class) appended — confirmed via direct read and via
  `grep -rn "opacity-70" app/familia/favoritas/page.tsx`, which returns no matches anywhere in
  the file.
- `candidate-card.tsx`'s disabled heart (line 101, `opacity-40`) and disabled "Ver perfil"
  (line 116, `opacity-40`) are the only opacity treatments left in this subtree, and they are
  no longer nested inside any additional opacity wrapper, so they now render at the documented
  40%, not the previous compounded 28%.
- The rest of a closed card (avatar, name, trust badge, match score) is now fully opaque,
  matching an active card exactly except for its two disabled controls plus the group header's
  pre-existing `text-ink-400`/"Necesidad cerrada" caption treatment (unchanged, and still
  outside the grid wrapper) — this keeps the "reads as intentionally closed, not broken" goal
  intact while making the disabled controls themselves clearly perceivable as controls (40%
  opacity, not 28%).
- **Verdict: fixed.** No regression introduced — no other opacity class was left behind on the
  grid or section wrapper.

### V04 — RESOLVED: disabled "Ver perfil" now matches the enabled version's alignment classes
- `candidate-card.tsx` line 116 (disabled placeholder) is now
  `pointer-events-none min-h-11 inline-flex items-center text-button text-primary-600 opacity-40`,
  which is exactly the enabled link's classes (line 108:
  `min-h-11 inline-flex items-center text-button text-primary-600`) plus
  `pointer-events-none` and `opacity-40` for the disabled treatment. `min-h-11` and
  `inline-flex items-center` are now present on both variants.
- Since the two controls sit in the same `flex items-center justify-between` footer row next to
  the 44px-tall heart button, both the active-necesidad and closed-necesidad card footers will
  now vertically align identically — no more baseline/height mismatch when scanning a mixed
  grid of active and closed favorites.
- **Verdict: fixed.**

## Full-story sanity check (all three rounds combined)

- `npm run build` completes cleanly with no errors/warnings related to these files.
- No `bg-raised` (bare) or other invented/non-existent Tailwind utility class remains anywhere
  in the touched files.
- No stray `opacity-70`/similar wrapper opacity remains on `app/familia/favoritas/page.tsx`.
- Touch targets (44px heart button, `min-h-11` links), loading-skeleton dimensional parity,
  empty-state copy/CTA (V02, still advisory-only, unaddressed and non-blocking per round 1/2),
  and FAM-04 grid/card reuse — all previously-passing checks from rounds 1-2 — are unaffected by
  this round's changes and remain valid on re-inspection.
- V02 (empty-state CTA label wording, Minor/advisory from round 1) remains open but was never
  blocking and is unchanged by this round's fixes.

## Round 3 Verdict

**VERIFIED** — All three Round 2 blocking/near-blocking findings (V01 toast background,
V03 compounding disabled-opacity, V04 disabled/enabled "Ver perfil" alignment) are confirmed
fixed at both the source and compiled-CSS level, with no regressions introduced and no new
issues found in this round. This is the third and final review cycle per AGENTS.md's
maximum-3-cycles rule; the story clears Visual QA. V02 (empty-state CTA wording consistency)
remains open as a non-blocking, advisory-only Minor item and may be picked up separately if
desired, but does not gate sign-off.
