# Visual QA — E7-01 / NIN-01/02 Onboarding perfil (niñera)

## Method

A dev server responded on `localhost:3000` (200), but `/ninera/perfil` (like every prior
`/familia/*` / `/ninera/*` route in this project's Visual QA history — e.g.
`agent/qa/e6-01-visual.md`) requires a real Supabase session: `NineraPerfilPage` redirects
unauthenticated requests to `/login` before rendering (confirmed directly — the fetched HTML
is AUTH-04's login form, not the wizard), and no seeded test session/cookie jar was available
in this pass. Per `config/CONSTRAINTS.md` "QA Ownership," this project is web-only and Visual
QA is agent-driven — no manual-QA stop applies here; this is a careful source-level review
instead. Reviewed: `components/ninera/perfil-ninera-wizard.tsx`,
`components/ninera/zona-multi-select.tsx`, `app/ninera/perfil/page.tsx`, `app/ninera/page.tsx`,
against `design/UI-SPEC.md`'s NIN-01/02 entry, `design/UI-SYSTEM.md` tokens, and
`components/familia/necesidad-wizard.tsx` (FAM-03, VERIFIED) as the "same wizard shell"
reference, plus `components/familia/zona-autocomplete.tsx` as the single-select original
`ZonaMultiSelect` adapts.

## Verdict

**REVISION_REQUIRED**

Field-level execution (photo upload, zona multi-select, stepper, day/time chips, dual salary
input, modalidad chips, char-counted textarea, repeatable referencias, low-pressure identity
prompt styling, 44px touch targets) is careful and consistent with FAM-03's visual language.
However, the one thing this story's UI-SPEC entry states most explicitly — "**same wizard
shell as FAM-03** (step progress indicator, sticky bottom nav mobile / **anchored side-rail
desktop**)" — is not actually implemented. `PerfilNineraWizard` has no desktop-specific layout
at all: no `isDesktop`/media-query branch, no side-rail `<aside>`, no multi-section scrollable
page, and the mobile `sticky bottom-0` action bar has no `lg:static` override (unlike
`necesidad-wizard.tsx`, which has both). At 1024px and 1440px this renders as a narrow
(`max-w-[720px]`) single-column page with a permanently pinned bottom bar — visually a mobile
layout stretched into a wide viewport, not FAM-03's actual desktop shell (`max-w-[1040px]`,
200px anchored left rail with 7 step links, `IntersectionObserver`-driven scrollable sections,
static in-flow action row). This is the specific comparison point this review was asked to
verify, and the pattern is not reused — it's simply absent.

## Findings

### E7-01-V01 — No desktop anchored side-rail shell; wizard renders as mobile layout at every breakpoint

- **Severity:** Major
- **Viewport:** 1024px (`lg`), 1440px desktop
- **Screen:** NIN-01/NIN-02 onboarding wizard (`perfil-ninera-wizard.tsx`)
- **Expected:** Per `design/UI-SPEC.md` NIN-01/02: "Same wizard shell as FAM-03 (step
  progress indicator, sticky bottom nav mobile / **anchored side-rail desktop**)." FAM-03's
  actual desktop implementation (`necesidad-wizard.tsx`): a `useMediaQuery`-driven `isDesktop`
  state; a `hidden lg:block` 200px `<aside>` with 7 clickable step labels
  (`aria-current="step"` on the active one); a scrollable `DesktopSections` container with an
  `IntersectionObserver` that keeps the rail's active state in sync with scroll position; the
  bottom action bar becomes `lg:static lg:mx-0 lg:bg-transparent lg:px-0` (no longer sticky,
  since actions live inline after the last section); overall container `max-w-[1040px]
  lg:flex-row lg:gap-10`.
- **Actual:** `perfil-ninera-wizard.tsx` has no `isDesktop` state, no media query, no `<aside>`,
  no `DesktopSections`-equivalent, and no `lg:` variant anywhere in its className strings
  (verified by inspecting every `lg:` occurrence in the file — there are none apart from
  `lg:py-12` on the outer `<main>`, a padding tweak only). The outer container is
  `max-w-[720px]` at every breakpoint, one step is shown at a time exactly as on mobile, and
  the bottom action bar (`sticky bottom-0 z-10 ... border-t border-border bg-bg/95`) stays
  permanently pinned to the viewport bottom even at 1440px, with no static/in-flow desktop
  variant. The result is a materially different, narrower, mobile-style experience on desktop
  than the one FAM-03 (this story's explicit shell reference) establishes elsewhere in the
  same product area.
- **Reproduction:** Open `/ninera/perfil` (or read `perfil-ninera-wizard.tsx` directly) and
  compare its className strings against `necesidad-wizard.tsx`'s `lg:`-prefixed classes,
  `DesktopSections`, and `DesktopActions` — none of that logic exists in the niñera wizard.
  Resize a rendered instance past 1024px: no side-rail appears, the page stays single-column,
  and the action bar remains fixed to the bottom edge of the viewport.

### E7-01-V02 — Identity-upload prompt renders as a distinct full screen, not "at the end of paso 2 (not a full step)"

- **Severity:** Minor
- **Viewport:** All (375, 430, 768, 1440)
- **Screen:** End-of-onboarding "Sube tu identificación" prompt
- **Expected:** `design/UI-SPEC.md`: "At the end of paso 2: a non-blocking prompt card (**not
  a full step**) — 'Sube tu identificación'..." — i.e., a card that appears alongside/at the
  tail of paso 2's own content, not a new navigational screen.
- **Actual:** `IdentityPromptCard` is returned from a top-level `if (finished) return ...`
  branch that replaces the entire wizard `<main>` with its own separate `<main>` (different
  max-width — 480px vs. the wizard's 720px — different centered/text-center layout, no step
  progress indicator, no "Paso X de 2" header, no wizard chrome at all). Functionally this is
  reached only after paso 2's fields are saved, so the flow order is correct, but visually it
  reads as a third, disconnected screen rather than a card attached to the end of paso 2 as
  the spec's parenthetical ("not a full step") calls for.
- **Reproduction:** Read `perfil-ninera-wizard.tsx` lines 118-120 and 461-481: `finished`
  swaps the entire component tree for a differently-shelled `<main>`, rather than rendering
  `IdentityPromptCard` as an additional card appended below paso 2's own field content within
  the same screen.

### E7-01-V03 — "Experiencia con edades" chip group has no corresponding entry in UI-SPEC's NIN-01/02 field list

- **Severity:** Minor (documentation gap, not a code defect)
- **Viewport:** N/A (content/spec gap)
- **Screen:** Paso 2
- **Expected:** `design/UI-SPEC.md` NIN-01/02 enumerates paso 2's fields explicitly:
  disponibilidad, expectativa salarial, modalidades aceptadas, descripción personal,
  referencias. No "experiencia con edades" field is mentioned anywhere in that entry.
- **Actual:** The wizard renders an additional required fieldset, "Experiencia con edades"
  (a multi-select chip group over `rangoEdadValues`), between modalidades and descripción.
  This is a real, schema-required field (`database.md` §3's completeness criteria and the
  `computeMatches` children-age-range matching depend on it, per the E7-01 code review), so
  building it is correct — but UI-SPEC's NIN-01/02 text doesn't describe its visual placement
  or chip treatment, so this specific execution (single fieldset, chips styled like FAM-03's
  per-child rango-edad chips but multi-select rather than single-select per child) hasn't been
  through an explicit UX/UI sign-off the way the `ZonaMultiSelect` deviation was. Recommend
  UI-SPEC be updated to document this field rather than leaving it as an implementation-only
  addition.
- **Reproduction:** Search `design/UI-SPEC.md`'s NIN-01/02 section for "edad" — no match;
  compare against `perfil-ninera-wizard.tsx` lines 317-338.

## Passing checks

- **Photo upload (paso 1):** exact 120px circular preview (`h-[120px] w-[120px]
  rounded-full`), camera-icon overlay badge (`Camera` icon, filled, `bg-primary-600`, bottom-
  right), upload spinner swapped in during transition — matches spec precisely.
- **Zona de trabajo multi-select:** `ZonaMultiSelect` genuinely reuses
  `zona-autocomplete.tsx`'s combobox interaction (same input styling, listbox markup,
  keyboard nav, `MapPin` icon, `h-11` rows) with selected zonas rendered as removable
  `primary-50`/`primary-600` chips — visually consistent with the single-select original, and
  the multi-select adaptation itself was already reviewed/flagged for Product sign-off by Code
  Review (not re-litigated here).
- **Años de experiencia stepper:** same −/count/+ numeric stepper pattern and `min-h-11
  min-w-11` touch targets as FAM-03's niños-count stepper.
- **Disponibilidad day/time chips:** identical chip + from/to time-input pattern to FAM-03
  step 3, same day-key set, same `min-h-11` pill sizing.
- **Expectativa salarial dual input:** identical MXN-prefixed dual-input + live formatted
  summary pattern to FAM-03 step 5.
- **Modalidades aceptadas:** multi-select chip row, `min-h-11`, consistent chip styling.
- **Descripción personal:** textarea with a live `{length}/1000` character-count helper below
  it, per spec.
- **Referencias:** repeatable nombre/relación/periodo/contacto field group with add/remove
  controls, matching "editable source of the `ReferenceList`" intent.
- **Identity prompt visual weight:** the card itself (once reached) is correctly low-pressure
  — plain `border-border` card, no `danger`/urgent color, "Más tarde" as a plain text-weight
  button and "Subir ahora" as the primary-styled button. "Subir ahora" is rendered `disabled`
  with `opacity-40` (the same disabled convention used throughout this wizard's own "Atrás" /
  "Siguiente" buttons) plus a `title="Próximamente"` hint — genuinely disabled-looking, not
  misleadingly interactive, and the in-code comment documents this as an intentional
  interim decision (NIN-08/E7-03 doesn't exist yet), consistent with this codebase's
  established "build only what exists to depend on" precedent (E4-04).
- **Touch targets:** every interactive control reviewed (photo button, zona chips/listbox
  rows, stepper buttons, day/time chips, modalidad chips, referencia inputs, nav buttons, and
  the identity-prompt buttons) uses `min-h-11`/`h-11` (44px), consistent with this codebase's
  convention.
- **Progress indicator:** 2 thin segments, filled `bg-primary-600` for completed/current,
  `bg-border` otherwise — same visual language as FAM-03's 7-segment indicator, just scaled
  to 2 steps.
- **`/ninera` onboarding gate:** mirrors FAM-01's `/familia` gate pattern exactly (server-side
  redirect to `/ninera/perfil` for an un-onboarded niñera) — `app/ninera/page.tsx` is
  otherwise an explicitly-labeled NIN-03 placeholder, correctly out of scope for this story.

## Deferred / out of scope for this pass

- Actual pixel rendering, focus order, and screen-reader announcement behavior need a live
  authenticated browser session (not available this pass, per the Method note above).
- NIN-03 (dashboard), NIN-08 (Subir identificación), and NIN-07 (Mi perfil) are separate,
  not-yet-built stories (E7-03/04) and are correctly out of scope here.

---

# Round 2

## Method

Re-read `components/ninera/perfil-ninera-wizard.tsx` in full (612 lines, post-refactor) and
diffed it directly against `components/familia/necesidad-wizard.tsx` (the shell reference)
line-by-line for the desktop-split structure. Re-checked `design/UI-SPEC.md`'s NIN-01/02
entry verbatim. Re-ran all automated validation commands myself (not trusting the developer's
report): `npm run lint`, `npm run typecheck`, `npm test -- --run --no-file-parallelism`,
`npm run check:secrets`, `npm run build`. No live browser session was available this round
either (same auth-gated-route limitation as Round 1) — this remains a source-level review.

## Verdict

**PASS**

Both prior findings are genuinely fixed, not just cosmetically patched, and no regressions
were introduced by the `Step1Fields`/`Step2Fields` extraction.

## Re-verification of prior findings

### E7-01-V01 — RESOLVED

`perfil-ninera-wizard.tsx` now has the real `isDesktop` media-query split
(`window.matchMedia("(min-width: 1024px)")`, lines 56-63), a `hidden w-[200px] shrink-0
lg:block` `<aside>` with a `sticky top-12` nav containing 2 step buttons
(`aria-current="step"` on the active one, lines 135-150) — structurally identical to
necesidad-wizard.tsx's 7-item version. A `DesktopSections` component (lines 229-283) renders
both steps as scrollable, always-mounted `<section id="step-N">` blocks inside a
`max-h-[calc(100vh-6rem)] overflow-y-auto` container, with the same
`IntersectionObserver`-driven active-step sync (`threshold: [0.25, 0.5, 0.75]`, root-scoped to
the container) as the reference. The bottom action bar carries the same
`lg:static lg:mx-0 lg:bg-transparent lg:px-0` override (line 208) that un-stickies it on
desktop. Rail-link navigation (`selectDesktopSection`) sets `step` and calls
`scrollIntoView({ behavior: "smooth", block: "start" })`, genuinely moving the scroll position
— confirmed functional, not decorative CSS. Outer container is `max-w-[1040px]
lg:flex-row lg:gap-10`, matching the reference exactly.

One small deviation from the reference worth noting (not re-opening V01, since it doesn't
affect layout/visual QA — this is a keyboard-focus nicety): necesidad-wizard.tsx's
`selectDesktopSection` also calls `target?.focus()` after `scrollIntoView`; the niñera
version's `selectDesktopSection` (line 128-131) does not call `.focus()` on the target
section. Both target `<section>`s do have `tabIndex={-1}` set up for exactly this purpose, so
the omission means keyboard/screen-reader focus doesn't actually follow the rail-driven
scroll on this wizard the way it does on FAM-03's. Recommend a one-line follow-up
(`document.getElementById(...)?.focus()`), but this is minor/accessibility-polish, not a
layout defect, and does not block this story.

### E7-01-V02 — RESOLVED

`IdentityPromptCard` is no longer reached via a top-level `if (finished) return ...` swap.
It is now rendered as a card appended directly after `Step2Fields`, inside paso 2's own
content — both in the mobile single-step view (`{step === 2 && (<><Step2Fields .../><...
finished && <IdentityPromptCard .../></>)}`, lines 192-197) and inside `DesktopSections`'s
`<section id="step-2">` (lines 274-280, appended after `Step2Fields` within the same
section). The wizard's outer chrome — the `<aside>` rail, the "Paso 2 de 2 · Disponibilidad y
referencias" header, the mobile step-progress bar — all remain visible and unchanged when
`finished` becomes true; only the bottom sticky/static action bar is hidden
(`{!finished && (...)}`, line 207), which is appropriate since the card supplies its own
"Más tarde"/"Subir ahora" actions. This matches the spec's "a non-blocking prompt card (not a
full step)" wording precisely — it is now visually a card at the tail of paso 2, not a
disconnected third screen.

### E7-01-V03 — unchanged (no code change requested)

Still an accurate, non-blocking documentation-gap observation from Round 1; no action needed
for this story to pass.

## Regression check on the Step1Fields/Step2Fields extraction

Compared the mobile-only render path (`isDesktop === false` branch, lines 177-199) against
the extracted `Step1Fields`/`Step2Fields` components' JSX (lines 285-579) and found no
behavioral drift: same photo-upload button/preview/camera-badge markup, same
`ZonaMultiSelect` wiring, same años-de-experiencia stepper, same day/time chips, modalidad
chips, dual salary inputs with live summary, "Experiencia con edades" chip fieldset,
character-counted textarea, and repeatable referencias group — all `min-h-11`/`h-11` touch
targets preserved. The desktop path renders the identical components with only heading-level
changes (`<h1>`/`<h2>` per section instead of one dynamic `<h1>`), which is correct/expected
for a single-scroll multi-section desktop layout. No new `lg:`-only conditional logic was
found that diverges between mobile and desktop field state or handlers — `data`/`update` are
threaded through unchanged in both paths.

## Automated checks (re-run independently this round)

- `npm run lint` — clean, no errors/warnings.
- `npm run typecheck` — clean (`next typegen && tsc --noEmit` succeeded).
- `npm test -- --run --no-file-parallelism` — **442 tests passed**, 64 files, no failures.
- `npm run check:secrets` — OK, no server-only secret exposed client-side.
- `npm run build` — production build succeeded (`next build`, Turbopack), all routes compiled
  including `/ninera/perfil`; only pre-existing Node 20 deprecation warnings from
  `@supabase/supabase-js`, unrelated to this story.

## Final verdict

**PASS**

Both the Major (V01) and Minor (V02) findings from Round 1 are genuinely and correctly
fixed — verified by direct structural comparison against the FAM-03 shell reference, not
just accepted on the developer's description. V03 remains a documented, non-blocking
intentional addition. One minor, non-blocking accessibility polish item is newly noted
(missing `.focus()` call on desktop rail navigation) but does not warrant another revision
cycle. All automated validation (lint, typecheck, 442 tests, secrets check, build) passes
independently.
