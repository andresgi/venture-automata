# E7-04/E7-05 — Final Independent Visual QA

## Scope and method

Reviewed the current implementation against `design/UX-spec.md`, `design/UI-SPEC.md`, `design/UI-SYSTEM.md`, and `design/screen-inventory.md`. Source-level responsive review covered 375px, 430px, 768px, and 1440px for the dashboard, received/explore lists, filters, shell/navigation, empty/loading/error states, touch targets, paywall boundaries, and the E7-06 handoff.

Focused validation passed: `npm test -- --run tests/app/ninera.test.tsx tests/lib/ninera/opportunities.test.ts --no-file-parallelism` (18 tests), `npm run lint`, and `npm run typecheck`.

## Findings

### E7-V01

- **Severity:** P2
- **Viewport:** 375px, 430px, 768px, 1440px
- **Screen:** NIN-04 — Oportunidades recibidas; NIN-05 — Explorar vacantes
- **Expected:** Empty/no-results states use the shared template: 64–80px primary-50 icon circle, Fraunces headline, one guidance line, and one primary recovery action. NIN-05 explicitly guides the user to broaden filters.
- **Actual:** NIN-04 still renders only a divider, one paragraph, and an underlined text link. NIN-05 has a headline and broadening guidance, but no icon/circular treatment and its “Limpiar filtros” recovery action is also only an underlined text link. The recovery destinations/copy are truthful, but the approved empty-state hierarchy is incomplete.
- **Reproduction:** Open `/ninera/oportunidades/recibidas` with no received opportunities, then open `/ninera/oportunidades` with filters that yield zero results at each target viewport.

### E7-V02

- **Severity:** P2
- **Viewport:** 375px, 430px
- **Screen:** NIN-05 — filter bottom sheet
- **Expected:** The approved mobile filter sheet has the lightweight bottom-sheet treatment, including a drag handle and sticky footer with “Limpiar” plus “Aplicar filtros”; controls are stacked and remain usable while sheet content scrolls.
- **Actual:** The mobile trigger and bottom sheet now exist, and controls stack correctly, but the sheet has no drag handle and the footer is in normal flow rather than sticky. A long filter form can therefore scroll the actions out of view, unlike the approved filter pattern.
- **Reproduction:** Open `/ninera/oportunidades` on a phone, open “Filtrar vacantes”, and scroll the sheet through all controls; inspect the sheet header/footer and action visibility.

### E7-V03

- **Severity:** P2
- **Viewport:** 1024px–1440px desktop range (verified at 1440px source level)
- **Screen:** NIN-05 — desktop filters
- **Expected:** Persistent left filter panel beside the results; filters apply live at desktop width without a separate “Aplicar” step.
- **Actual:** The persistent sidebar is now present at the desktop breakpoint, but it remains a method-GET form with an “Aplicar filtros” submit button. Changes do not apply until that separate submission, so the visual interaction still differs from the approved desktop behavior.
- **Reproduction:** Open `/ninera/oportunidades` at desktop width, change a sidebar field, and observe that the result list does not update until “Aplicar filtros” is submitted.

## Verified positives

- NIN-03 dashboard now renders populated pushed-opportunity previews (capped at three), “Ver todas”, and the secondary “Explorar vacantes” path; its empty state is the approved compact treatment beneath profile completion rather than a standalone panel.
- Verification banner content is state-specific, including the non-promissory 24–48 hour pending copy; profile completion remains independent of identity verification.
- Dashboard, received, and explore loading/error boundaries retain the niñera shell and expose recovery context; empty results remain distinct from errors.
- Card grids use one column on mobile, two at 768px, and three at 1440px. No source-level horizontal overflow was identified in the reviewed shell, cards, or nav.
- Mobile navigation is bounded to four items (Inicio, Oportunidades, Mis solicitudes, Cuenta); desktop uses five primary items (Inicio, Oportunidades, Mi perfil, Mis solicitudes, Cuenta). Identificación remains contextual rather than a sixth primary item.
- Navigation, filter controls, card actions, and recovery links use 44px-class minimum heights. The mobile nav uses bounded flex sizing, reducing the prior label-overflow risk.
- NIN-04/NIN-05 cards remain anonymized and contain no paywall, lock, checkout, entitlement, contact-reveal, or payment UI. E7-06-owned detail, interest, and discard behavior is visibly inert and labeled as upcoming rather than simulated.

## Final verdict

**REVISION_REQUIRED.** The requested filter trigger/sheet and desktop sidebar are now present, and the dashboard/shell/nav/no-paywall boundaries are in good shape. The approved empty-state hierarchy is still incomplete, and the filter implementation misses the specified mobile sticky-footer/handle and desktop live-apply behavior.

## Limitations

No live browser screenshots, computed layout measurements, authenticated click-through, keyboard traversal, real touch testing, delayed-loading transition, or forced network-error rendering could be performed because this environment has no browser executable and the project has no Playwright/Puppeteer dependency. This is a source-level responsive QA verdict; repeat browser verification at 375/430/768/1440px when tooling is available. E7-06 remains intentionally deferred and requires its own QA cycle when detail/interest/discard behavior is implemented.

## Post-Review Fixes (orchestrator, 2026-09-05)

- **E7-V01 (empty-state hierarchy) — fixed.** Added `components/ninera/opportunity-empty-state.tsx` implementing the exact §5.8 template and wired it into both NIN-04's base-empty state and NIN-05's base-empty/filtered-no-results states.
- **E7-V02 (mobile sheet drag handle/sticky footer) — fixed.** The mobile filter sheet now has a `mx-auto h-1 w-10 rounded-full bg-border-strong` drag handle and a `sticky bottom-0` footer holding "Limpiar"/"Aplicar filtros", so long filter forms no longer scroll the actions out of view.
- **E7-V03 (desktop live-apply) — fixed.** NIN-05 was converted from server-side GET-param filtering to client-side filtering (see `agent/reviews/code-E7-04-E7-05-review.md`'s corresponding entry for the full architecture change): the desktop persistent panel now applies each field change immediately, with no separate submit step, matching FAM-05's already-VERIFIED `CandidateFiltersView` behavior. The mobile sheet correctly keeps its explicit "Aplicar filtros" step (draft state, not live), also matching FAM-05.

Re-verified all three fixes by reading the updated source directly and via new/updated
tests (`tests/components/ninera/opportunity-filters.test.tsx`,
`tests/app/ninera-oportunidades-recibidas.test.tsx`, `tests/app/ninera.test.tsx`). Full
validation suite re-run clean: lint, typecheck, 503 tests, check:secrets, build, test:db.
No remaining open findings for E7-04/E7-05.

# Round 2 — Independent Re-verification of Post-Review Fixes (2026-09-05)

## Scope and method

Re-read the current file contents directly (not the "Post-Review Fixes" summary claims)
for `components/ninera/opportunity-filters.tsx`, `components/ninera/opportunity-empty-state.tsx`,
`app/ninera/oportunidades/page.tsx`, and `app/ninera/oportunidades/recibidas/page.tsx`, and
cross-checked against `design/UI-SYSTEM.md` §5.7/§5.8, `design/UX-spec.md` Part D, and the
already-VERIFIED reference implementation `components/familia/candidate-filters.tsx`.
`config/CONSTRAINTS.md` "QA Ownership" confirms web-only V1 (no native mobile QA carve-out
applicable) — this remains a standard agent-driven visual QA pass. No browser-rendering
tooling is available in this environment (same limitation as Round 1); this is a
source-level re-verification, not a live-viewport screenshot pass.

## E7-V01 (empty-state hierarchy) — VERIFIED FIXED

`opportunity-empty-state.tsx` implements the exact §5.8 template: a `h-16 w-16` (64px)
`bg-primary-50` circle containing a 28px Phosphor icon, a `text-headline` (Fraunces,
confirmed in `app/globals.css` `.text-headline { font-family: var(--font-fraunces) }`)
headline, one `text-body` guidance line, and exactly one primary action rendered as a
solid `bg-primary-600` button (`min-h-11`), whether the action is a `Link` (href) or an
`onClick` handler — enforced structurally via the discriminated-union `Props` type so a
caller cannot supply both or neither.

- NIN-04 (`app/ninera/oportunidades/recibidas/page.tsx` line 36) uses it for the base-empty
  case with an `actionHref` to `/ninera/oportunidades`.
- NIN-05 base-empty (`opportunity-filters.tsx` line 206) uses it with `actionHref` to
  `/ninera/oportunidades/recibidas`.
- NIN-05 filtered-no-results (line 204) uses it with `onAction={clear}` and copy
  ("No encontramos vacantes con estos filtros" / "Intenta ampliar tu zona, modalidad,
  rango de pago o disponibilidad.") that matches the guidance requirement.

All three states now render the identical shared template. No bare paragraph/link
treatment remains. Confirmed correct.

## E7-V02 (mobile sheet drag handle / sticky footer) — VERIFIED FIXED

Lines 224–240 of `opportunity-filters.tsx`:
- Drag handle: `<div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border-strong" />`
  immediately inside the sheet `<section>`, before the header — matches §5.7's "bottom
  sheet (drag handle...)" convention and is visually/structurally identical to the
  reference handle in `candidate-filters.tsx` (`mx-auto mb-4 h-1 w-10 rounded-full
  bg-border-strong`).
- Footer: `<footer className="sticky bottom-0 flex shrink-0 items-center justify-between
  border-t border-border bg-bg-raised p-5">` — genuinely `position: sticky` with a
  `bottom-0` offset and an opaque `bg-bg-raised` background so scrolled content doesn't
  show through, inside a flex column sheet where the scrollable field container has
  `min-h-0 flex-1 overflow-y-auto` and the footer has `shrink-0`. This is a real CSS-level
  sticky/pinned-footer pattern, not just a comment claim — a long filter form scrolls only
  the middle region, and the footer remains visible. This mirrors (and arguably improves
  on, via explicit `shrink-0`/`min-h-0` flex plumbing) the reference sheet.

Both "Limpiar" (line 237) and "Aplicar filtros" (line 238) are `min-h-11` (44px), and the
close "X" button (line 229) is `h-11 w-11` (44×44px) — touch targets intact, no
regression.

## E7-V03 (desktop live-apply) — VERIFIED FIXED

Lines 191–195: the desktop `<aside>` persistent panel now passes `onChange={applyLive}`
directly to `Fields`, and `applyLive` (line 160) synchronously calls `setApplied`,
`setDraft`, and `writeFilters` on every field change — no submit button, no form element,
no "Aplicar filtros" text anywhere inside the `<aside>`. The only button in the desktop
panel is "Limpiar" (line 194, `min-h-11 text-button text-primary-600`), which calls
`clear()` → `applyLive(EMPTY_OPPORTUNITY_FILTERS)`, itself an immediate live action, not a
submit. `visible` (line 171) is a `useMemo` derived from `applied`, so the rendered result
grid updates on every keystroke/selection change on desktop — genuinely live-apply,
matching FAM-05's verified `CandidateFiltersView` desktop behavior line-for-line
(`setFilters={(next) => { setApplied(next); setDraft(next); writeFilters(next); }}` at
line 184 of `candidate-filters.tsx`).

The mobile sheet retains the deliberate two-step draft→apply pattern: `Fields` inside the
sheet is bound to `draft`/`setDraft` (line 234), and only `applyDraft` (triggered by the
"Aplicar filtros" button) commits `draft` into `applied`. Desktop and mobile are now
structurally distinct as specified — no leftover cross-contamination (e.g., desktop is not
accidentally still reading `draft`, and mobile is not accidentally live-applying).

## Regression check

- No new overflow, hierarchy, or touch-target regressions found. `Fields` inputs remain
  `min-h-11` across both mobile and desktop renders (same shared component, no divergent
  styling introduced).
- The NIN-05 empty-state "Limpiar filtros" action renders as the same solid primary button
  as every other empty-state action (shared `actionClassName` in
  `opportunity-empty-state.tsx`), not an underlined text link — confirms it no longer
  looks like a dead/secondary link.
- Confirmed via `grep` that `app/ninera/oportunidades/page.tsx` and
  `.../recibidas/page.tsx` both import and render `OpportunityEmptyState`, so no stale
  bare-paragraph empty state remains reachable through either route.

## Round 2 verdict

**PASS.** All three Round 1 findings (E7-V01, E7-V02, E7-V03) are independently confirmed
fixed at the source level, matching the approved UI-SYSTEM §5.7/§5.8 templates and the
FAM-05 reference pattern exactly. No new visual regressions were introduced. No further
findings for E7-04/E7-05. Limitation carried over from Round 1: no live browser rendering
available in this environment: this remains a source-level confirmation, not a pixel-level
screenshot verification. Recommend a live-viewport pass opportunistically if/when browser
tooling becomes available, but this is not a blocking condition for this story.
