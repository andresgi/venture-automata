# Visual QA — E6-01 / FAM-11 Estado de candidatas (pipeline)

## Method

No live browser-rendering session was used against an authenticated `/familia/*` route
(Playwright is installed in this repo and a dev server responded on `localhost:3000`, but
every `/familia/*` route requires a real Supabase session — `PipelinePage` redirects
unauthenticated requests to `/login` before rendering — and no seeded test session/cookie
jar was available in this pass, consistent with the method used in prior Visual QA reports
for this project, e.g. `agent/qa/e5-04-visual.md`). This is a careful source-level review:
Tailwind classes in `components/familia/pipeline-board.tsx`,
`app/familia/necesidad/[id]/pipeline/page.tsx` + `loading.tsx`, `app/familia/page.tsx`, and
`components/familia/contact-request-form.tsx` were checked against `design/UI-SPEC.md`
FAM-11, `design/UI-SYSTEM.md` tokens/component conventions, and this project's own prior
patterns (`components/familia/favorite-toggle.tsx` for Toast reuse,
`app/familia/favoritas/page.tsx` / `app/familia/necesidad/[id]/page.tsx` for the empty-state
template, `components/familia/necesidad-wizard.tsx` / `candidate-filters.tsx` for pill/chip
touch-target precedent). Per `config/CONSTRAINTS.md` "QA Ownership," this project is web-only
and Visual QA is agent-driven — no manual-QA stop applies here.

## Verdict

**PASS_WITH_MINOR_ISSUES**

Desktop kanban geometry, no-color-coding rule, column header (`h2` + `ink-400` count),
horizontal-scroll-not-shrink behavior, always-available Descartar, the FAM-04-pointing empty
state, and the Toast reuse all match spec precisely. Two real, but non-blocking, deviations
were found on the mobile view: the segmented-control tabs render below the 44px touch-target
convention this codebase otherwise applies to pill controls, and the stacked mobile rows
render more inline actions than FAM-11's mobile spec describes, with a margin class that
doesn't suit its new horizontal context.

## Findings

### E6-01-V01 — Mobile segmented-control tabs render below the 44px touch-target convention

- **Severity:** Minor
- **Viewport:** 375px, 430px
- **Screen:** FAM-11 mobile pipeline (segmented control row)
- **Expected:** Interactive controls follow this codebase's 44px minimum touch-target
  convention (`min-h-11`), as used for the equivalent day/modalidad pill in
  `necesidad-wizard.tsx` (`min-h-11 rounded-full border px-4 py-2 text-body-sm`) and for
  every other primary tap target in this story (`Ver perfil`/`Descartar`/advance links all
  use `min-h-11`).
- **Actual:** The segmented control's tab buttons (`pipeline-board.tsx` line ~179) use
  `rounded-full border px-4 py-2 text-body-sm` with no `min-h-11`. `text-body-sm` resolves to
  an 18px line-height (`app/globals.css`); with `py-2` (16px total vertical padding) the
  rendered tab height is ~34px — below the 44px target this same file uses for every other
  control. This is the primary navigation control for switching pipeline states on mobile,
  so it's worth fixing even though `candidate-filters.tsx`'s checkbox-backed pills share the
  same shortfall elsewhere in the codebase (pre-existing, not a regression, but also not a
  reason to propagate it into a new primary nav control).
- **Reproduction:** Render `PipelineBoard` below `lg`, inspect a `role="tab"` button's
  computed height in devtools — ~34px, not 44px.

### E6-01-V02 — Mobile stacked row renders more inline actions than FAM-11's mobile spec, with a mismatched margin

- **Severity:** Minor
- **Viewport:** 375px, 430px
- **Screen:** FAM-11 mobile pipeline (stacked candidate row)
- **Expected:** `design/UI-SPEC.md` FAM-11 mobile row content is `photo 40px + nombre +
  days-in-state meta + "Ver perfil"` only — the spec deliberately calls this a *denser* row,
  distinct from FAM-04's full card.
- **Actual:** The mobile row reuses the same `PipelineActions` component as the desktop
  kanban card, so it also renders the `Avanzar` label (up to "Marcar entrevista agendada")
  and `Descartar` inline, beyond what the mobile spec lists. Functionally reasonable (parity
  with desktop, not a spec violation of the Descartar-always-available rule), but visually it
  works against the "denser/simpler mobile row" intent, and `PipelineActions`' `mt-3`
  (correct when stacked under the avatar row on the desktop card) is applied unchanged inside
  the mobile row's `flex items-center` parent, where it instead pushes the actions block down
  out of vertical alignment with the avatar/name column, and — with three text controls plus
  a possible spinner competing for space against `flex-1` name text at 375px — the row is
  prone to wrapping untidily rather than reading as a single denser line.
- **Reproduction:** Render a `contactada`-state item in the mobile view at 375px; observe the
  `PipelineActions` block sits visibly lower than the avatar due to `mt-3`, and with a long
  advance label present, the row wraps across multiple lines instead of the spec's single
  dense row.

## Passing checks

- **Desktop kanban geometry:** `w-[220px] shrink-0` columns inside `overflow-x-auto` —
  exact 220px width, horizontal scroll rather than column shrinkage, matching spec.
- **No color-coding:** every column (including `descartada`) uses the same neutral
  `border-border bg-bg-raised` / card `border-border bg-bg` — no per-state hue, correctly
  avoiding the temptation to redden the discarded column.
- **Column header:** `h2` label + `text-ink-400` count, exactly per spec.
- **Descartar always available:** rendered on every card/row regardless of column/state
  except once already `descartada` (sensible - re-discarding a discarded candidate is a
  no-op the UI correctly omits), matching the code-review's confirmed idempotent-discard
  guarantee.
- **Empty state:** identical template (icon container, `h2`, body copy, primary CTA sizing)
  to the established `EmptyState` pattern in `app/familia/favoritas/page.tsx` and
  `app/familia/necesidad/[id]/page.tsx`, and its CTA correctly routes back to FAM-04
  (`/familia/necesidad/${necesidadId}`).
- **Success toast:** `Toast` from `components/shared/toast.tsx` is reused exactly as
  established in E4-04's `FavoriteToggle` (same local `{message, variant}` state shape, same
  `setToast(null)` on new action start, single-toast-at-a-time), producing "Marcada como
  Entrevista"/"Marcada como Contratada" per spec, not a reimplementation.
- **Loading skeleton:** `loading.tsx` mirrors the final board's geometry (5 `w-[220px]`
  column skeletons desktop, segmented-control + row skeletons mobile), consistent with the
  sibling FAM-04 loading convention.
- **FAM-10 -> FAM-11 handoff:** `contact-request-form.tsx` now adds an explicit "Ver
  pipeline" link (`min-h-11`, 44px) alongside "Seguir buscando candidatas" and "Cancelar,"
  resolving the gap flagged in `agent/qa/e5-04-visual.md` (E5-04-V01-FINAL).
- **FAM-02 entry point:** `app/familia/page.tsx`'s `NecesidadCard` adds a "Ver pipeline"
  link (`min-h-11`) for active necesidades, alongside the existing compact plain-text
  pipeline summary line (no per-state badges, matching FAM-02's own spec).
- **Touch targets elsewhere:** `Ver perfil`, `Descartar`, and advance-state controls all use
  `min-h-11` consistently on both desktop and mobile.
- **Ownership/state logic reflected visually:** no `Avanzar` control renders for `nueva`
  (its only forward path is the paid E5-04 flow), matching the code review's confirmed
  structural exclusion.

## Deferred / out of scope for this pass

- Actual pixel rendering, keyboard/focus order, screen-reader announcement behavior, and
  real touch measurement need a live authenticated browser session (not available this
  pass, per the Method note above).
- E6-02 (NIN-09 read-only mirror) is out of scope for this story/review.

## Post-Review Fix (orchestrator, 2026-09-04)

Both V01 and V02 fixed directly:

- **V01 fixed:** mobile segmented-control tabs now use `flex min-h-11 shrink-0 items-center`
  (was `py-2`, ~34px) — 44px touch target restored, matching the convention used everywhere
  else in this codebase.
- **V02 fixed:** `PipelineActions` now accepts a `className` prop instead of a hardcoded
  `mt-3` wrapper. The mobile stacked row splits into two lines: the photo/nombre/meta row
  (unchanged, matches spec) and a second `border-t border-border pt-3` actions line below
  it, so Avanzar/Descartar/Ver perfil no longer render misaligned inside the row's
  `items-center` flex parent. Desktop kanban cards keep their original `mt-3` spacing via
  the same prop's default value, unaffected by this change.

Re-ran lint/typecheck/412 tests/check:secrets/build — all clean. No open issues remain for
E6-01.
