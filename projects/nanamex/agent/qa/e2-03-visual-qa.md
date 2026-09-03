# Visual QA — E2-03 / FAM-02 "Mis necesidades" dashboard

## Verdict

**PASS**

## Scope and tooling

- QA Ownership checked (`config/CONSTRAINTS.md`): web QA is agent-driven; no mobile/native
  QA applicable (web-only V1). This is a rendered Next.js web page, so browser-based visual
  QA applies directly.
- Branch: `nanamex/e2-03-fam02-dashboard`, working tree as supplied (`app/familia/page.tsx`,
  `app/globals.css`, `app/familia/loading.tsx`, plus their tests). No production files were
  modified during this review.
- **Real local Supabase stack** used throughout (`supabase start` + `supabase db reset
  --local`, Docker-based, port 55321/55322), not mocks — all 11 migrations applied cleanly.
- **Real browser rendering was available this session** (Playwright 1.62.1 + a pre-cached
  Chromium build were present in the environment, unlike the tooling gap noted in prior
  `agent/qa/e1-03-visual-qa.md` / `e2-01-visual-qa.md`), installed standalone into the QA
  scratchpad (not added to the project's `package.json`/lockfile) so this review is
  **screenshot-confirmed**, not source-level-only.
- Full real auth flow was driven end-to-end through the actual app, not mocked: registered
  a familia account via `/registro?role=familia`, retrieved the real confirmation email via
  Mailpit's REST API (`http://127.0.0.1:55324`), followed the real `/auth/confirm` token-hash
  link (this also confirmed, as a side observation, that `/auth/confirm` redirects straight
  to `/familia` rather than to `/verificar` — outside this story's scope, noted for the
  record only), then reused the resulting real session cookies (`storageState`) for every
  subsequent screenshot/navigation. `perfil_familiar` (FAM-01) and test `necesidades`/
  `pipeline` rows were seeded directly via SQL (`docker exec` into the Supabase Postgres
  container) per the story's own guidance, to isolate this review to FAM-02 rather than
  re-testing FAM-01/wizard/publish flows already covered by `e1-03`/`e2-01`/`e2-02`.
- Focused automated tests: `npx vitest run tests/app/familia.test.tsx
  tests/app/familia-loading.test.tsx` — **7/7 PASS**.
- Viewports covered: **375, 390, 430, 768, 1280, 1440px** (390 used in place of a second
  "phone" width alongside the required 375/430; all four required widths — 375, 430, 768,
  1440 — were explicitly captured).

## Verification performed

### Empty state (fresh account, zero necesidades)
Screenshotted at 390px and 1280px (`00-post-register.png` through `11-empty-desktop.png` in
QA scratchpad). Confirmed:
- Icon (Phosphor `Heart`, outline weight) inside a 64px circular `primary-50` container,
  icon itself `primary-600` — within UI-SYSTEM §5.8's specified 64–80px container range.
- Headline "Encuentra a tu próxima niñera" renders in **Fraunces** (visibly serif
  letterforms, distinct from the rest of the page) — matches UI-SPEC's exact required copy
  and UI-SYSTEM §5.8's template (icon → Fraunces headline → one body line → one primary
  action).
- One guidance line ("Cuéntanos qué necesitas y te mostraremos niñeras compatibles con tu
  familia.") in body copy, one primary "Crear necesidad" button below it (`primary-600`,
  white text). No extraneous elements — not a generic empty-state illustration, consistent
  with UI-SYSTEM §0.1–0.3's calm/editorial direction.
- "Crear necesidad" also appears as the header action (top-right on desktop, stacked below
  the `h1` on mobile) per FAM-02's layout spec.

### Populated dashboard (draft + active-with-pipeline)
Seeded one `borrador` necesidad and one `activa` necesidad with three real `pipeline` rows
(2 `nueva`, 1 `entrevista`) against real niñera `profiles` rows. Screenshotted at 375, 390,
430, 768, 1280, and 1440px (`20`–`23`, `50`–`51` in scratchpad). Confirmed:
- **Grid**: single column at 375/390/430px; 2-column grid at 768px and 1280/1440px (matches
  "single column mobile; 2-column card grid ≥768px" — FAM-02 does not specify a 3rd column
  at wider desktop, unlike FAM-04, and none is present here, correctly).
- **Card content**: zona ("Centro, Monterrey" / "Obispado, Monterrey") + modalidad
  ("Ocasional" / "Entrada por salida") + status chip ("Borrador" / "Activa", pill shape,
  neutral `ink-600` on `bg` with `border` per §5.5's Status chip spec) + for the active card
  only, a pipeline summary line reading **"2 nuevas · 1 en entrevista"**.
- **Pipeline summary is genuinely plain text**, not colored badges/pills: confirmed via
  screenshot (same `body-sm`/`ink-600` styling as the modalidad line above it, no pill
  background, no per-state color) and via source (`app/familia/page.tsx`'s
  `pipelineSummary()` returns a single joined string, rendered as one `<p>`). This
  specifically satisfies the spec's explicit warning ("plain text, not 5 separate badges").
- **Draft card correctly has no pipeline line** (drafts have no pipeline yet) and its action
  reads "Continuar borrador"; the active card's action reads "Ver candidatas" — both exactly
  as specified.
- **Long-content stress test**: seeded a third `activa` necesidad with a deliberately very
  long `colonia` name and a fuller 3-state pipeline ("1 nueva · 1 contactada · 1
  contratada"). At both 375px and 1280px the zona text wraps cleanly onto multiple lines
  with no overflow/clipping/horizontal scroll, and the grid's per-row card heights adjust
  independently with no broken alignment (`60-stress-mobile.png`, `61-stress-desktop.png`).

### Navigation
- "Ver candidatas" on the active card has `href="/familia/necesidad/{id}"` and, when
  clicked, actually navigates there and renders that necesidad's real candidate list
  (`30-fam04-target.png` — three candidate cards showing the seeded 80%/75%/90% scores).
- "Continuar borrador" on the draft card has `href="/familia/necesidad?draft={id}"` and,
  when clicked, actually resumes the wizard on Step 1 with the draft's real saved data
  pre-filled (age range "1-3" pre-selected, zona "Centro, Monterrey" pre-filled, día "lun"
  09:00–05:00 pre-filled) — confirms "Continuar borrador" is a real resume, not a blank
  wizard (`31-wizard-resume-target.png`).

### Loading state
Caught the **real, live** skeleton render (not just source inspection) by opening a
`LOCK TABLE necesidades IN ACCESS EXCLUSIVE MODE` transaction directly against the local
Postgres container to force the page's data fetch to stall, then navigating and
screenshotting mid-stall (`40-loading-mobile.png`, `41-loading-desktop.png`), followed by a
post-recovery screenshot confirming the real data replaced the skeleton once the lock
released (`42-post-loading.png`). Confirmed the skeleton geometry plausibly mirrors the
final card layout: 1-column mobile / 2-column ≥768px grid, each skeleton card matching the
real `NecesidadCard`'s structure (title bar + chip placeholder, top-right; a secondary line;
a summary line; an action-line placeholder), per UI-SYSTEM §5.10.

### Typography scarcity (§0.4)
- Dashboard `h1` ("Mis necesidades") renders in **Inter** (no serif letterforms) — confirmed
  visually and via `app/globals.css`'s `.text-h1` rule, which sets no `font-family` override
  and therefore inherits `body`'s Inter.
- Card text, status chips, and the pipeline summary all render in Inter.
- Only the empty-state headline renders in Fraunces — no Fraunces leakage into the populated
  dashboard's transactional UI, correctly honoring the scarcity rule.

### Color tokens (§3.1, §0.9)
- Page background is the warm `bg` cream tone (`#fbf8f3`), not a cool/neutral gray.
- Cards use `bg-raised` (white) with a visible 1px hairline `border` and **no drop shadow at
  rest** — confirmed visually at every captured viewport; matches §0.9's flat/no-shadow
  resting-state rule.
- "Crear necesidad" (both header and empty-state variants) uses `primary-600` terracotta
  fill with white text; "Ver candidatas"/"Continuar borrador" action links use `primary-600`
  terracotta text. Contrast-checked: `primary-600` (#c1522c) text on white/`bg-raised`
  computes to **4.66:1**, `ink-600` on `bg-raised` to **7.36:1**, `ink-900` on `bg-raised` to
  **16.34:1** — all clear WCAG AA for normal text.

## Findings

### E2-03-V01 — Card action links ("Ver candidatas" / "Continuar borrador") have a touch target well under 44px on mobile

- **Severity:** Minor
- **Viewport:** 375, 390, 430px (measured at 390px; layout is identical at the other two)
- **Screen:** FAM-02 `/familia`, populated dashboard
- **Expected:** UI-SYSTEM §5.1 establishes 44px as this system's default touch-target
  height, and this link is the single actionable element on an otherwise non-interactive
  card — the primary way a family opens a necesidad's candidates or resumes a draft.
- **Actual:** Playwright's measured bounding box for both "Continuar borrador" and "Ver
  candidatas" is **117×18px and 92×18px respectively** — the full clickable text width, but
  only 18px tall (the link has no vertical padding beyond its `body-sm` line-height). This
  is below both UI-SYSTEM's own 44px touch-target convention and WCAG 2.5.8's 24×24px
  minimum target size guidance for a standalone (non-inline-text) action.
- **Reproduction:** Open `/familia` with at least one necesidad at a 375–430px viewport;
  inspect the `<Link>` rendered by `NecesidadCard` in `app/familia/page.tsx` (no `py-*`
  padding on the action link) or measure its bounding box in a browser dev tools/automation
  tool.
- **Recommendation:** Not blocking for this story (the rest of FAM-02 fully matches spec and
  the card itself remains scannable/usable), but worth a small follow-up — e.g. adding
  vertical padding to the action link (or making the whole card/footer row tappable) the
  next time this component is touched — since this is the primary navigation action off the
  dashboard's only screen.

No other visual, layout, overflow, hierarchy, typography, or state-handling defects were
found.

## Positive checks (no issues)

- Header layout: centered-content `h1` + primary "Crear necesidad" button, top-right on
  desktop, stacked below the `h1` on mobile (an explicitly spec-sanctioned simplification —
  UI-SPEC allows "inline top button on mobile too" as an alternative to the sticky-bottom
  variant, and the code's own comment documents this choice deliberately).
- Empty vs. populated vs. loading states are all visually and structurally distinct, with no
  bleed-through of one state's styling into another.
- No badge-stacking (§5.5's "no more than two badge-like elements per card" is respected —
  each card carries exactly one status chip and, for active necesidades, one plain-text
  summary line, not additional badges).
- Responsive behavior is clean at every required breakpoint (375/430/768/1440px) plus 390
  and 1280px spot-checks — no horizontal scrollbars, no clipped text, no broken grid at any
  width tested, including a deliberately long zona-name stress case.

## Environment cleanup

Local dev server and ad hoc SQL fixtures (draft/active necesidades, throwaway niñera
profiles, one long-name zona, one test familia account) were created solely inside the local
Supabase Docker stack for this QA session; no production system was touched and no source
files were modified. The local Supabase stack was left running per the repo's normal local-dev
convention (matching prior QA sessions); no application source, migration, or test file was
altered by this review.

## Recommendation

**PASS.** FAM-02 matches the approved UX/UI specification at every viewport tested — layout,
grid breakpoints, card composition (zona + modalidad + status chip + plain-text pipeline
summary + correct action link), empty state, loading state, navigation targets, and the
Inter/Fraunces typography scarcity rule all hold up under real, screenshot-confirmed browser
verification (not source-inspection-only, per the tooling now available in this
environment). One minor, non-blocking touch-target finding (E2-03-V01) is recorded for a
future follow-up but does not warrant REVISE.
