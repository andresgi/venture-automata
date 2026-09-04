# Visual QA — E5-03 — FAM-08/FAM-09 paywall + checkout screens

## Final verdict

**PASS_WITH_MINOR_ISSUES**

## Scope and evidence

- QA ownership: web QA is agent-driven per `config/CONSTRAINTS.md` "QA Ownership" (mobile
  native QA is explicitly not applicable — web-only V1). No manual-QA carve-out applies to
  this story.
- No browser-rendering tooling is available in this environment (checked
  `node_modules/.bin` and `PATH` for playwright/puppeteer/chromium — none present), same
  constraint documented in `agent/qa/e4-03-visual.md` and `agent/qa/e5-01-visual.md`. This
  review is **source-level**, not rendered-screenshot-confirmed, at 375/430/768/1440px.
- Compared `components/familia/paywall-gate.tsx`, `components/familia/checkout-return-banner.tsx`,
  `components/familia/contact-button.tsx`, `components/familia/candidate-detail-actions.tsx`,
  `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`, and `app/globals.css` against
  `design/UI-SPEC.md` FAM-08/FAM-09, `design/UI-SYSTEM.md` §4.4 (`PaywallGate`), §5.7
  (modals/dialogs), §6 (elevation table), and `design/UX-spec.md` Decision 4 / FAM-08 /
  FAM-09 entries.
- Read `agent/reviews/code-E5-03-review.md` for what was already checked at the code level
  (functional/hydration/entitlement-routing issues) to avoid duplicating non-visual findings;
  confirmed the hydration-mismatch issue it flagged in `checkout-return-banner.tsx` (Important
  Issue #1) is no longer present in the current source — it now reads `useSearchParams()`
  directly rather than a `useState` lazy initializer touching `window.location`, so nothing
  further to flag there visually.
- Traced the token wiring explicitly: `--shadow-elevation-3` (`0 16px 48px rgba(36,31,25,0.18)`)
  and `--color-overlay-scrim` (`rgba(36,31,25,0.45)`) are declared inside `@theme` in
  `app/globals.css`, correctly generating the Tailwind v4 utilities `shadow-elevation-3` and
  `bg-overlay-scrim` used as `lg:shadow-elevation-3` / `lg:bg-overlay-scrim` in
  `paywall-gate.tsx`. Values match `UI-SYSTEM.md` §3.1/§6 exactly. This wiring is correct.
- Ran the focused suite: `tests/components/familia/paywall-gate.test.tsx`,
  `checkout-return-banner.test.tsx`, `contact-button.test.tsx`,
  `candidate-detail-actions.test.tsx` — **18/18 passed**. No production code was modified by
  this review.

## Passing checks

- **Mobile/desktop shell split matches §5.7 exactly:** outer container is
  `fixed inset-0 ... flex items-stretch justify-center lg:items-center lg:bg-overlay-scrim` —
  no scrim class below `lg`, `bg-overlay-scrim` only appears at `lg`. Dialog panel is
  `w-full` (stretched full-height via `items-stretch`, full-bleed, no rounding) below `lg`,
  and `lg:w-[560px] lg:rounded-lg lg:shadow-elevation-3` at `lg` — the literal 560px/elevation-3
  values from both UI-SPEC FAM-08 and UI-SYSTEM §5.7.
- **Close ("✕") is top-left** via `self-start` inside the `flex-col` panel, 44px (`h-11 w-11`)
  touch target, disabled (with `disabled:opacity-40`) while `locked` (pending/confirming) —
  matches FAM-09's "close/back affordance disabled during processing" rule.
- **Candidate-context row** uses a 40px (`h-10 w-10`) photo/initial-fallback + name +
  default (`compact`, 24px) `TrustBadge` — matches FAM-08's content-hierarchy #1 and
  `TrustBadge`'s documented compact-inline-pill default (`components/shared/trust-badge.tsx`).
- **Lock iconography** matches §4.4 exactly: outline `LockSimple`, `primary-600`, inside a
  circular `primary-50` container, above the headline — never red/exclamation.
- **Headline uses the `headline` (Fraunces) token** (`text-headline`) for the single
  price/offer line, per §4.4's "one of the scarce Fraunces moments" rule.
- **"Qué incluye" list** is 3 plain `body`/`ink-600` lines, no icons — correctly avoids
  borrowing `MatchScore`'s `Check`-icon convention, per spec's explicit instruction.
- **Cerrar/Cancelar always equally visible as the primary action**, same relative
  position (primary bottom, secondary text-link directly below) on both FAM-08 and FAM-09 —
  no dark-pattern asymmetry (§4.4).
- **Non-dismissible during processing** correctly covers both phases: `isPending`
  (entitlement-check request) and `confirming` (post-redirect hand-off) both disable ✕/
  Cancelar/Escape via the shared `locked` flag — matches FAM-09's explicit requirement.
- **Order summary (FAM-09)** is a flat line-item row (`border-t border-b`, no card wrapper),
  matching "no card-within-card treatment."
- **Error state** uses `role="alert"` with `danger-50`/`danger-600` tokens and does not lose
  place (dialog stays open, step unchanged) — matches "does not lose place."
- **Focus trap / keyboard nav**: close button auto-focused on open, `Tab`/`Shift+Tab` wrap
  correctly among non-disabled focusable elements, `Escape` closes (respecting `locked`), no
  `outline-none`/focus-ring suppression anywhere in the component — no obvious a11y defect.
- Upstream screens (FAM-04/05/06/07) render no lock icon/blur/dim language per the
  cross-cutting checklist — confirmed no new paywall visual language was introduced outside
  `PaywallGate` itself.

## Findings

### E5-03-V01 — Mobile full-screen takeover has no scroll path, and body scroll is locked while open

- **Severity:** Medium
- **Viewport:** 375, 430px (also relevant at 768px in portrait with a shorter effective
  viewport, e.g. mobile Safari's collapsed-toolbar height)
- **Screen:** FAM-08 (offer) and FAM-09 (checkout) steps
- **Expected:** The mobile full-screen takeover should remain fully reachable regardless of
  content height — either the content always fits, or the takeover itself scrolls.
- **Actual:** The dialog panel's className (`flex w-full flex-col bg-bg-raised px-5 py-6
  lg:max-h-[90vh] ... lg:overflow-y-auto ...`) only gets `overflow-y-auto`/`max-h-[90vh]` at
  `lg`. Below `lg` there is no `overflow-y-auto`/`max-h`/`min-h-0` on the panel or its
  `fixed inset-0` parent, and the open-state effect explicitly sets
  `document.body.style.overflow = "hidden"` for the whole time the dialog is open
  (`paywall-gate.tsx:83-84`). If the panel's natural content height (close button + candidate
  row + icon + 2–3 line Fraunces headline + 3-line list + optional error banner + primary
  button + Cancelar link, or FAM-09's header + order-summary row + bridging paragraph +
  button + Cancelar) exceeds the visible viewport height — plausible on shorter devices,
  with the error banner shown, or with larger accessibility text sizes — the overflow content
  (frequently including the primary "Continuar a pago"/"Confirmar pago" button itself) is
  completely unreachable: no page scroll (locked) and no dialog-internal scroll (not enabled).
- **Reproduction:** At 375×667 (or narrower/shorter), open FAM-08, trigger the error state
  (adds the inline banner), and observe that the bottom of the panel — including the primary
  CTA — can render below the fold with no way to scroll to it.

### E5-03-V02 — Primary CTA is full-width on desktop, not "standard width" as FAM-08/FAM-09 specify

- **Severity:** Minor
- **Viewport:** 1440px (desktop dialog)
- **Screen:** FAM-08 "Continuar a pago" and FAM-09 "Confirmar pago"
- **Expected:** UI-SPEC FAM-08 content hierarchy item 4: "Primary button 'Continuar a pago'
  (**full-width mobile, standard width desktop**)" — i.e. distinct treatment per breakpoint.
- **Actual:** Both buttons use `mt-6 flex h-11 w-full ...` with no `lg:` override — `w-full`
  applies identically inside the 560px desktop dialog (spanning the ~496px content area after
  `lg:px-8` padding on both sides), not a "standard" (content-sized) desktop width. No other
  place in this codebase currently establishes a "full-width mobile / auto-width desktop"
  button pattern to reuse (checked for `lg:w-auto`/`sm:w-auto` precedent — none found), so
  this appears to be a straightforward miss rather than an established, differently-named
  convention.
- **Reproduction:** Open FAM-08 or FAM-09 at ≥1024px and compare the primary button's width
  against the spec's explicit mobile/desktop distinction.

### E5-03-V03 — FAM-09 success state has no filled-check icon/animation before the interim substitute

- **Severity:** Minor
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-09 success (interim substitute: `CheckoutReturnBanner`)
- **Expected:** UI-SPEC FAM-09: "success (brief confirmation state — a single filled-check
  icon animation per §0.12's restrained-motion rule — before auto-advancing to FAM-10)."
- **Actual:** `CheckoutReturnBanner`'s success banner renders a static `CheckCircle`
  (`weight="fill"`) icon with no animation/transition at all — not even a restrained one.
  This is a minor gap on top of an already-documented, reasonable interim scope narrowing
  (FAM-10/E5-04 doesn't exist yet, so the auto-advance itself is correctly deferred and not
  re-flagged here). Since the icon and copy already exist, adding a brief fade/scale-in
  transition consistent with §0.12 would be a low-cost improvement independent of the
  FAM-10 dependency.
- **Reproduction:** Return from Stripe with `?checkout=success` and observe the banner
  appears instantly with no motion.

## Recommendation

Fix V01 (scroll path on the mobile takeover, combined with the body-scroll lock — this is the
one finding with real potential to hide the primary CTA and should be resolved before
RELEASE_GATE), and consider V02/V03 as low-cost polish. None of these block marking E5-03
**VERIFIED** for BUILD purposes given the story's `PASS_WITH_MINOR_ISSUES` code-review verdict,
but V01 should not be silently carried into RELEASE_GATE — recommend a rendered mobile
spot-check (short-viewport device, error state visible) once browser tooling is available, in
addition to source-level re-verification after a fix.

## Post-Review Fix (orchestrator, 2026-09-04)

V01 and V02 fixed directly, V03 deferred:

- **V01 fixed:** the dialog shell (`components/familia/paywall-gate.tsx`) now has
  `overflow-y-auto` applied unconditionally (previously `lg:overflow-y-auto` only), so the
  mobile full-screen takeover can scroll its own content when it exceeds viewport height,
  even while `document.body.style.overflow` is locked. The primary CTA is now always
  reachable regardless of content length/viewport/accessibility text size.
- **V02 fixed:** the three primary CTA buttons ("Continuar a pago", "Confirmar pago",
  "Entendido") now add `lg:w-auto lg:self-center lg:px-10` so they're full-width on mobile
  but standard/intrinsic width on desktop, matching FAM-08's explicit spec text.
- **V03 (icon animation) left as a non-blocking follow-up**, per this report's own
  recommendation — no established motion/animation token or convention exists elsewhere in
  this codebase to reuse, and it's cosmetic, not functional; noted in
  `agent/DECISIONS.md`/`agent/BACKLOG.md`'s E5-03 entry as a pre-RELEASE_GATE item.

Re-ran lint/typecheck/329 tests/check:secrets/build after both fixes — all clean.
