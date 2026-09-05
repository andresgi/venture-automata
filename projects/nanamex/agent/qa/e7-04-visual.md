# E7-04 Visual QA — revised NIN-03 dashboard

## Review scope

Re-reviewed the revised E7-04 implementation against `design/UX-spec.md` (NIN-03/NIN-05), `design/UI-SPEC.md`, `design/UI-SYSTEM.md`, and the current route/navigation source. Checked responsive classes and interaction states for 375, 430, 768, and 1440px. Focused Vitest coverage passed: 12 tests.

Browser tooling is not available in this environment (`command -v` found no Chromium/Chrome/Playwright, and the project has no Playwright dependency), so live authenticated rendering, screenshots, computed dimensions, and real network loading/error transitions could not be exercised. Findings below are source-level responsive/visual QA findings.

## Findings

### V01

- **Severity:** P1 — required populated state and navigation path missing
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** NIN-03 — Inicio / Oportunidades recientes
- **Expected:** NIN-03 shows a recent-opportunities preview in its default/populated state, with a “Ver todas” path to received opportunities (NIN-04), while the empty state uses Explorar as recovery.
- **Actual:** The revised page never queries or renders opportunities; `EmptyOpportunities` is rendered unconditionally. Consequently there are no opportunity cards and no “Ver todas”/NIN-04 entry even when pushed opportunities would exist. The empty placeholder and “Explorar vacantes” recovery link are present and point to the implemented `/ninera/oportunidades` route, but this only covers the zero-opportunity branch.
- **Reproduction:** Authenticate as an onboarded niñera with one or more pushed opportunities, open `/ninera`, and inspect the “Oportunidades recientes” section; the same empty placeholder is shown and no received-opportunity list or “Ver todas” action can appear.

### V02

- **Severity:** P2 — responsive touch-target/layout risk
- **Viewport:** 375px and 430px mobile
- **Screen:** NIN-03 — persistent niñera navigation
- **Expected:** The bottom navigation remains within the viewport, with each tab easy to tap and its icon/label readable without horizontal overflow.
- **Actual:** Four mobile links are laid out with intrinsic widths inside `justify-around`; each link is horizontal (`icon + label`) and has only `px-2`, not `flex-1`/a bounded width. The long “Oportunidades” and “Identificación” labels plus icons can require more width than the 93.75px-per-tab budget at 375px (and leave little margin at 430px), risking squeezed or overflowing tabs. No live browser measurement was possible.
- **Reproduction:** Open `/ninera` at 375px and inspect the fixed bottom bar; compare the combined intrinsic widths of “Inicio”, “Oportunidades”, “Mi perfil”, and “Identificación” against the viewport. Tap each item and confirm the complete label remains visible and the target is not clipped.

### V03

- **Severity:** P2 — banner treatment does not match approved trust hierarchy
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** NIN-03 — verification banner
- **Expected:** The persistent verification banner is full-width and uses the relevant trust token styling for the current state, with the banner-scale TrustBadge (24px icon) and inline explanation.
- **Actual:** The banner-scale TrustBadge and inline copy are present, but the containing banner always uses neutral `border-border bg-bg-raised` regardless of `no_verificada`, `en_proceso`, or `verificada`. This loses the approved state-colored persistent-banner treatment even though the badge itself retains the correct state colors/icons.
- **Reproduction:** Render NIN-03 for each verification status and compare the banner background/border; the container classes remain identical for all three states.

### V04

- **Severity:** P2 — empty-state composition differs from screen-level spec
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** NIN-03 — Oportunidades recientes empty state
- **Expected:** NIN-03’s empty message is a compact single-line/message-plus-action treatment beneath the profile-completion section, preserving the dashboard hierarchy; the full empty-state template is specified for the NIN-04 list.
- **Actual:** The revised page adds the correct 64px circular `primary-50` icon container, Fraunces headline, explanatory text, and recovery link, but wraps them in a large bordered, padded card (`px-6 py-10`) under a separate section divider. This reads as a full standalone empty-state panel rather than the compact NIN-03 preview treatment.
- **Reproduction:** Open `/ninera` with zero opportunities at any target width and compare the resulting panel to UI-SPEC NIN-03 §322–337.

## Verified positives

- Banner `TrustBadge` uses the banner variant with a 24px icon and at least a 44px control height; pending copy includes “Normalmente toma 24–48 horas”.
- Progress hierarchy is ordered banner → profile completion/progress bar → opportunities section; the progressbar exposes 0–100 bounds and `aria-valuenow`.
- Dashboard loading skeleton exists with `aria-busy="true"`; the route error state offers a 44px “Intentar de nuevo” control.
- Empty opportunities now has an actionable “Explorar vacantes” recovery path, and `/ninera/oportunidades` has a real authenticated placeholder page rather than a dead link. Profile and identification links also resolve to existing routes.
- Desktop uses the approved 248px fixed sidebar; mobile uses a fixed 60px-plus-safe-area bottom bar and dashboard padding reserves bottom space.

## Verdict

**REVISION_REQUIRED.** The revised pass resolves the prior missing empty-state recovery path and loading state, but the populated opportunity preview/NIN-04 path is still absent. The mobile nav has a source-level overflow risk, the verification banner remains neutral instead of state-colored, and the NIN-03 empty composition is larger than the approved screen-level treatment.
