# Visual QA — E1-01 AUTH-01 Landing + role selection

**Branch reviewed:** `nanamex/e1-01-landing-role-selection`
**Screen(s):** `/` (AUTH-01 Landing). Registro (`/registro`) checked only for role-navigation
outcome, per orchestrator instruction — not a full AUTH-02 review.
**Method:** Rendered the actual running app (`next dev`, Turbopack) via headless Chromium
(Playwright), at 375, 390, 768, 1024, 1280, 1440, and 1920px widths. Screenshots taken, DOM
computed-style/geometry assertions taken via `page.evaluate`, click-through navigation
tested end to end. Not a source-code-only review.
**QA Ownership check:** `config/CONSTRAINTS.md` confirms Web QA (Visual QA) is agent-driven
for this venture — no native mobile app, no manual-QA carve-out applies. Proceeded with
browser-based review.

## Critical safety check — no-child-imagery (UI-SYSTEM §0.10)

**Result: PASS.** Opened `public/images/auth-01-hero.jpg` directly (2400×1600 source) and
inspected it at full resolution, not just the cropped render. The photo shows exactly one
adult woman, alone, in a wood-panelled home kitchen, cutting fruit. No child, partial child,
implied child, or any other person is present anywhere in the frame. No other image exists
on the page (`app/page.tsx` renders exactly one `<Image>`). The photo's own sourcing note
(`public/images/README-auth-01-hero.md`) documents that it was manually screened against
this exact rule before selection, and that ambiguous candidates were rejected outright. I
independently confirm this photo contains no child-imagery ambiguity. This is not a
blocking issue.

The photo's content mismatch (not literally a "caregiver/family moment," just a woman
alone) was raised in the initial pass as an informational note. Per the coordinator, this
has since been escalated to and resolved by the human as an accepted placeholder, tracked
as a pre-RELEASE_GATE item in `agent/DECISIONS.md`. Not re-flagged here.

## Findings from initial pass

### V-01 — Desktop hero photo does not fill remaining width (leaves a growing blank gap)

- **Status: RESOLVED — confirmed fixed on recheck (see "Recheck" section below).**
- **Severity (at time of original finding):** Major
- **Original viewport:** 1440px desktop (one of the four mandated review widths);
  reproduced at 1024, 1280, and 1920px too, confirming it was systemic, not an edge case.
- **Screen:** AUTH-01 Landing, desktop layout
- **Expected:** Per UI-SPEC AUTH-01 "Desktop" bullet: "two-column hero — copy + role CTAs
  left (max 480px column), photography right (**fills remaining width**), `radius-lg` on
  the image container only."
- **Original actual behavior:** The photo column was implemented with `lg:w-1/2` (a fixed
  50%-of-viewport width) instead of filling whatever space remained after the
  480px-capped copy column, leaving a permanent band of plain `bg` background between the
  photo's right edge and the viewport's right edge (32px gap at 1024px, up to 480px gap at
  1920px). See "Recheck" below for the fix and verification.

### V-02 (informational, out of E1-01's own scope) — AUTH-02 registro screen doesn't match UI-SPEC's role-indicator-chip and button-color spec

The task asked me to confirm role navigation and screenshot the resulting registro state.
Navigation itself works correctly (see "Navigation" below), but the destination screen has
two visible deviations from `design/UI-SPEC.md` AUTH-02 and `design/UI-SYSTEM.md` §3.2 that
are worth flagging even though this screen was built under a different story (code comments
in `components/marketing/role-select-buttons.tsx` indicate the registro form already existed
from E0-04, before this story):

1. AUTH-02 spec calls for "small role indicator chip at top (non-interactive here, e.g.
   'Registro · Familia')" as a distinct element above the `h1` "Crea tu cuenta." The actual
   render has no separate chip — the role is instead concatenated into the h1 itself:
   "Crear cuenta — Familia" / "Crear cuenta — Niñera." This is a different visual
   composition than specified (one combined heading vs. heading + separate small
   non-interactive chip).
2. The primary "Crear cuenta" button renders as solid near-black
   (`rgb(23,23,23)`-range/dark ink), not `primary-600` (`#C1522C` terracotta) used correctly
   everywhere on the AUTH-01 landing page's own primary button. Per UI-SYSTEM §5.1, Primary
   buttons should be `primary-600`. This is a visible cross-screen brand-consistency defect,
   confirmed identically on both mobile (390px) and desktop (1440px) registro screenshots.
   Since AUTH-01's own primary button uses the correct terracotta, this makes the visual
   inconsistency obvious to a user moving from landing → registro in a single flow.
3. AUTH-02 spec calls for a "legal consent checkbox (small, `body-sm`)" between the
   password-confirmation field and the primary button. No checkbox is visible in the
   rendered form (Nombre → Correo → Teléfono → Contraseña → Confirmar contraseña → "Crear
   cuenta" button directly, no consent control in between).

I'm not scoring these against E1-01's own verdict since AUTH-02 is a different
screen/story, but flagging them now since I rendered and screenshotted the screen anyway per
this task's instructions, and #2 in particular directly touches this story's own "primary
button = terracotta" brand-consistency claim. Not re-verified in the recheck pass below
(out of the recheck's targeted scope); still open for whoever owns AUTH-02.

## Spec-compliance checklist (AUTH-01, this story's actual scope)

| Check | Result | Evidence |
|---|---|---|
| Mobile: single column, 4:5 crop hero | Pass | `aspect-[4/5] w-full` confirmed via computed geometry at 375/390/768px |
| Mobile: scrim gradient bottom third + Fraunces headline over scrim | Pass | Screenshot shows white headline/subhead legible over a dark-to-transparent scrim; `h1` font-family confirmed `Fraunces, "Fraunces Fallback", serif` |
| Mobile: adults-only hero, no child in frame | **Pass (critical check)** | Full-resolution image inspected directly — one adult woman, alone |
| Mobile: two role buttons stacked below hero, same width | Pass | Both buttons measured 327×44px, x=24, 12px gap, at 375px viewport |
| Desktop: two-column, copy ≤480px left | Pass | Copy column measured exactly `{width:480}` at 1024–1920px, both before and after the V-01 fix |
| Desktop: photography right, fills remaining width | **Pass on recheck** (was Fail — V-01) | See "Recheck" section — image now reaches viewport's right edge exactly at 1024/1280/1440/1920px |
| Desktop: `radius-lg` on image container only | Pass | `border-radius: 20px 0 0 20px` on image wrapper only; nothing else on the page uses radius-lg; now that the image's right edge is flush with the true viewport edge, the left-only rounding reads as correct (no floating square corner in blank space anymore) |
| Hierarchy: photo/headline → role choice → trust summary → footer | Pass | Confirmed in both mobile and desktop screenshots, correct order |
| Visual emphasis: only 2 role buttons compete for primary weight | Pass | No other primary-styled button/link exists on the page |
| 3-line trust summary, plain text + outline icons, not badges | Pass | Three rows (verification/references/reporting), each a small outline Phosphor icon (shield, chat bubble, flag) + plain text, no pill/badge container |
| Footer: legal links | Pass, with a minor addition | "Términos y condiciones," "Aviso de privacidad" present; footer also includes "Ya tengo cuenta" (not a legal link, but a low-weight text link, does not compete visually) and a temporary CC BY 2.0 photo-attribution line, both reasonably justified — not flagged as a defect |
| Fraunces reserved for headline only, Inter elsewhere | Pass | Confirmed via computed `font-family` on `h1` (Fraunces) vs body copy/footer (Inter) on both mobile and desktop variants of the headline |
| Color: `bg` warm off-white, not stark white | Pass | Computed `background-color: rgb(251, 248, 243)` = exactly `#FBF8F3` |
| Color: primary button terracotta, not blue/generic | Pass | Computed `background-color: rgb(193, 82, 44)` = exactly `#C1522C` (`primary-600`) |
| Secondary button: outline, `border-strong`, same width as primary | Pass | Both buttons 384px wide (desktop) / 327px (mobile), identical height 44px; secondary border color `rgb(216,207,192)` = exactly `#D8CFC0` |
| Touch targets ≥44px | Pass | Both role buttons measured 44px tall on mobile and desktop |
| States: default only, no auth state expected | Pass | Nothing else to check — no loading/error/empty state applies to this screen per spec |

## Navigation check

- `/` → click "Soy familia" → lands on `/registro?role=familia`, confirmed via
  `page.url()` after navigation, both at 390px and 1440px viewports.
- `/` → click "Soy niñera" → lands on `/registro?role=ninera`, same confirmation.
- Both links are real Next.js `<Link>` elements with correct `href`s
  (`components/marketing/role-select-buttons.tsx`), not JS-only handlers — degrade
  gracefully, are keyboard/crawlable.
- Role does get reflected on the destination screen (as "Crear cuenta — Familia" / "Crear
  cuenta — Niñera" in the h1), just not in the specific "small chip" visual form AUTH-02
  describes — see V-02 above (out of this story's scope).

## Responsive behavior notes (not defects)

- At 768px (tablet, UI-SYSTEM's `md` range), the page continues to use the mobile
  single-column hero layout (the two-column desktop layout only activates at Tailwind's
  `lg` = 1024px breakpoint, matching UI-SYSTEM §2's "lg ≥1024px" desktop definition).
  UI-SPEC AUTH-01 only defines "mobile" and "desktop" variants and doesn't call out a
  distinct tablet treatment, so inheriting the mobile layout through the `md` range is a
  reasonable reading of the spec, not a violation. At 768px the 4:5-cropped hero is tall
  enough that the role buttons sit right at/just past the initial viewport fold on a
  768×1024 device — consistent with the spec's own description of mobile buttons being
  "below the fold," not a bug.

## Dev-environment artifact excluded from findings

A small black circle with an "N" mark appears bottom-left in every screenshot. Confirmed via
DOM inspection this is a `<nextjs-portal>` element — Next.js's built-in dev-tools indicator,
present only in `next dev` mode, not application UI. Excluded from all findings above.

---

## Recheck (targeted, post-fix)

**What changed:** Per the Developer, the image column's Tailwind classes moved from
`lg:w-1/2` to `lg:w-auto lg:flex-1`, and the copy column moved from `lg:w-1/2
lg:max-w-[480px]` to `lg:w-[480px] lg:shrink-0` — letting the photo column claim all
leftover row space via flexbox instead of being pinned to a fixed 50%. The `sizes` prop on
the `next/image` was also updated to `(min-width: 1024px) calc(100vw - 480px), 100vw`.

**What I did:** Re-rendered the same branch (working-tree state, not yet committed) via
`next dev` + headless Chromium, re-ran the exact same `getBoundingClientRect()` geometry
probe used to originally catch V-01, at 1024/1280/1440/1920px, took fresh screenshots at
1440/1920px, did a mobile (375px) full-page re-screenshot, and independently ran
`npx vitest run tests/app/page.test.tsx` (6/6 passed) rather than only trusting the
Developer's self-reported test run.

**Result — V-01 confirmed fixed:**

| Viewport | Copy column | Image column | Image right edge | Gap |
|---|---|---|---|---|
| 1024px | `{x:0, width:480}` | `{x:480, width:544}` | 1024 | **0px** |
| 1280px | `{x:0, width:480}` | `{x:480, width:800}` | 1280 | **0px** |
| 1440px | `{x:0, width:480}` | `{x:480, width:960}` | 1440 | **0px** |
| 1920px | `{x:0, width:480}` | `{x:480, width:1440}` | 1920 | **0px** |

The image's right edge now exactly equals the viewport width at every size tested — visually
confirmed in screenshots at both 1440px and 1920px (photo runs flush to the browser edge,
no blank strip). This directly satisfies AUTH-01's "photography right (fills remaining
width)" requirement. The copy column stays correctly pinned at exactly 480px throughout, so
the "max 480px column" requirement is also still intact.

**Regression sanity check (quick, not a full re-review):**

- Mobile (375px): pixel-identical to the original pass — 4:5 hero crop (`{width:375,
  height:468.75}`, 0px radius), scrim + Fraunces headline overlay, "Soy familia"/"Soy
  niñera" buttons stacked below, trust summary, footer all unchanged. No regression.
- Desktop button hierarchy: primary "Soy familia" still exactly `rgb(193, 82, 44)`
  (`primary-600`) at 384×44px; secondary "Soy niñera" still 384×44px with the correct
  `border-strong` outline. Same width, same position, no change from original pass.
- Desktop headline: still Fraunces, still `ink-900` (`rgb(36, 31, 25)`) on the light
  background (correctly not white here — white is reserved for the mobile scrim variant).
- Desktop image container radius: still `20px 0px 0px 20px` (radius-lg, left corners
  only) — and now that the image's right edge is flush with the true viewport edge, the
  earlier "secondary effect" concern (square corners floating in blank space) is resolved:
  the square right corner now correctly sits at the true edge of the viewport, where no
  rounding is needed.
- Page background still exactly `rgb(251, 248, 243)` (`#FBF8F3`).
- `npx vitest run tests/app/page.test.tsx`: 6/6 passed (independent spot-check, not just
  taking the Developer's word for the full 88/88 suite).

No other regressions observed in this targeted pass.

## Updated Verdict: PASS

Rationale: the no-child-imagery safety gate — this story's most critical acceptance
criterion — passes cleanly with no ambiguity. The one substantive defect found in the
initial pass, V-01 (hero photo not filling remaining width on desktop, a direct,
measurable contradiction of AUTH-01's written spec), has been fixed and independently
re-verified via the same geometry probe that originally caught it, at all four
originally-affected breakpoints (1024/1280/1440/1920px), with zero gap in every case. A
quick regression sweep of mobile layout, button hierarchy/color/sizing, typography, and
background color found no new issues introduced by the fix. E1-01 (AUTH-01 Landing + role
selection) is VERIFIED against `design/UI-SPEC.md` AUTH-01 from a Visual QA standpoint.

The hero-photo content mismatch (placeholder photo doesn't literally depict a
caregiver/family moment) is out of this verdict's scope — already escalated to and
resolved by the human as an accepted, tracked pre-RELEASE_GATE item per
`agent/DECISIONS.md`, not a BUILD-phase blocker.

V-02 (AUTH-02 registro screen's chip/button-color/consent-checkbox gaps) remains open but
does not affect this verdict — it belongs to a different screen/story (E0-04) and should be
routed to whoever owns AUTH-02's acceptance separately.

## Recommended next step

E1-01 can proceed past Visual QA. Recommend a separate ticket/backlog note against AUTH-02
(E0-04) covering V-02's three items (role-indicator chip composition, primary-button color,
missing legal-consent checkbox) — not a re-open of this story.
