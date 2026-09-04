# Code Review — E5-03: FAM-08/09 paywall + checkout screens

## Verdict

**PASS_WITH_MINOR_ISSUES**

## Summary of independent verification performed

- Read `engineering/implementation-plan.md`'s E5-03 entry, `design/UI-SPEC.md` FAM-06/
  FAM-08/FAM-09 (plus the cross-cutting visual QA checklist and SYS-02's "return the user
  mid-FAM-09" note), `design/UI-SYSTEM.md` §4.4 (`PaywallGate` composition) and §6
  (elevation table), `design/UX-spec.md` Decision 4 and its FAM-08/FAM-09 screen entries
  and Part E's flagged-gap list, `design/screen-inventory.md`.
- Read the full diff surface: `components/familia/paywall-gate.tsx`,
  `components/familia/checkout-return-banner.tsx`, `components/familia/contact-button.tsx`,
  `components/familia/candidate-detail-actions.tsx`,
  `app/familia/necesidad/[id]/candidatas/[ninId]/page.tsx`, `app/globals.css`, and all four
  associated test files.
- Cross-read `actions/entitlements.ts` (E5-01, already VERIFIED) to confirm `PaywallGate`
  only calls the existing server action and adds no new server-side surface.
- Re-ran the full validation suite myself: `npm run lint` (clean), `npm run typecheck`
  (clean), `npm test -- --run --no-file-parallelism` (328/328 passing, 47 files), `npm run
  check:secrets` (OK), `npm run build` (clean production build, `/familia/necesidad/[id]/
  candidatas/[ninId]` present as a dynamic route).

## Critical Issues

None.

## Important Issues

1. **`CheckoutReturnBanner` reads `window.location.search` inside a `useState` lazy
   initializer, which is a genuine SSR/hydration-mismatch risk at exactly the moment this
   component matters most.** (`components/familia/checkout-return-banner.tsx:27-31`) The
   parent page is a Server Component (`force-dynamic`) that renders this Client Component
   as part of the initial SSR/RSC pass, where `typeof window === "undefined"` is true, so
   the server-rendered HTML always contains `state = null` (nothing rendered). During
   client hydration, `window` is defined, so the lazy initializer synchronously computes
   `state = "success"`/`"cancel"` on the very first client render — precisely the render
   React uses to reconcile against the already-committed server HTML. This is a textbook
   hydration mismatch (content differs between server and client's first render), and it
   happens on the actual Stripe-redirect-return request, i.e. every real "success"/"cancel"
   round trip a family makes. React will recover by discarding/re-rendering the mismatched
   subtree (so the banner still ultimately renders correctly), but this is exactly the
   pattern Next.js/React explicitly warn against, produces a `console.error`
   ("Hydration failed...") in every environment including production, and risks a visible
   flash/reflow right as a paying family lands back on the page. No other file in this
   codebase uses `typeof window` this way (`grep` confirms this is a new, one-off pattern);
   the existing idiom elsewhere is to initialize state to `null`/`false` and only touch
   `window` inside a `useEffect`. Recommend moving the URL read into a `useEffect(() => {
   ... }, [])` with an initial `state = null`, accepting one extra render before the banner
   appears, rather than reading `window` from the initializer. The component's own comment
   ("a pure read of the current URL, not a setState-in-effect") frames this as a
   deliberate optimization, but the optimization is what introduces the bug — it should be
   reverted to the effect-based pattern.
2. **`ContactButton`/`PaywallGate` always opens the FAM-08 payment-offer screen first, even
   for a family that already has an active entitlement**, rather than "routing straight to
   FAM-10" as FAM-06's own spec literally requires (`design/UI-SPEC.md` line 203: "fires
   `PaywallGate` per §4.4 if unlocked entitlement absent, **otherwise routes straight to
   FAM-10**"). The page never pre-checks entitlement status before rendering
   `CandidateDetailActions`/`ContactButton` (no `entitlements` query exists in
   `page.tsx`), so every click of "Contactar" — entitled or not — opens the same
   dialog and shows the MX$299 offer + "qué incluye" copy; only after the family clicks
   "Continuar a pago" does the round-trip through `createCheckoutSessionAction` reveal
   `already_entitled` and swap to a distinct "ya tienes acceso" step. For a family that has
   already paid, this means seeing a full payment-offer screen (candidate photo, price,
   "qué incluye" list, "Continuar a pago" primary button) before being told they don't need
   to pay again — a materially worse experience than E5-01's already-approved interim
   behavior (a same-click toast, no intermediate offer screen at all, per
   `agent/DECISIONS.md`'s 2026-09-04 E5-01 entry). This is a defensible interim narrowing
   given FAM-10 (E5-04) genuinely doesn't exist yet to route to, and it is a real,
   correctly-implemented defense-in-depth safety net (an already-entitled family can never
   accidentally double-pay). But unlike E5-01's direct-redirect exception — which was
   explicitly flagged, human-approved, and recorded in `agent/DECISIONS.md`/`BACKLOG.md`
   before being marked VERIFIED — this narrowing was only characterized informally to the
   reviewer as "defense-in-depth" rather than being recorded as the deliberate,
   spec-deviating interim behavior it actually is for the *common* already-entitled path
   (repeat visits within the 30-day window, not just a rare race). Recommend: (a) record
   this explicitly in `agent/DECISIONS.md`/`BACKLOG.md`'s E5-03 entry as an interim
   exception pending E5-04, matching the project's own established convention for exactly
   this kind of gap, and (b) consider a low-cost improvement — pass an
   `initialAlreadyEntitled` flag computed server-side in `page.tsx` (it already queries the
   DB for everything else on this page) so `PaywallGate` can skip straight to the
   `already_entitled` step without ever flashing the payment offer, even before FAM-10
   exists to redirect to.
3. **No test exercises the `already_entitled` step at all** — neither
   `paywall-gate.test.tsx` nor `candidate-detail-actions.test.tsx`/`contact-button.test.tsx`
   covers `createCheckoutSessionAction` resolving `{ status: "already_entitled" }`. Given
   Important Issue #2 above, this is the one behavior most likely to regress silently, and
   it currently has zero coverage.

## Minor Issues

1. `paywall-gate.tsx`'s focus trap (`useEffect` at line 81) recomputes `focusable()` from a
   live DOM query on every `Tab` keypress rather than caching the list — harmless at this
   scale (a handful of buttons), not worth abstracting.
2. The `AlreadyEntitledStep`'s "Entendido" button (line 329) has no `disabled`/loading
   affordance, unlike every other action in this component — inconsequential since it only
   calls `onClose` synchronously, but slightly inconsistent with the rest of the file's
   careful loading-state discipline.
3. `applicationOrigin()`'s validation (`actions/entitlements.ts`, pre-existing from E5-01,
   unchanged here) is reused as-is for the new `returnPath` construction — confirmed
   `necesidadId`/`nineraId` are UUID-validated by `inputSchema` before being interpolated
   into the return URL, so no injection risk was introduced by this story routing through
   the same path a second time (paywall open, not just checkout creation).

## Security Observations

- No new server-side surface was introduced by this story — `PaywallGate` only calls the
  already-reviewed `createCheckoutSessionAction` (E5-01); all authorization
  (session/role/`activa`-status, verification-gate re-check, necesidad-ownership and
  candidate-matching re-validation, active-entitlement short-circuit) still happens
  server-side, unchanged.
- Candidate `nombre`/`fotoUrl` are rendered via JSX text nodes/`<img src>`/`alt` attributes
  only — no `dangerouslySetInnerHTML` anywhere in the diff, so no XSS vector from candidate
  profile data.
- `CheckoutReturnBanner`'s `?checkout=success|cancel` read is client-only cosmetic state — a
  manually crafted `?checkout=success` URL can make the banner claim "Contacto
  desbloqueado" without having paid, but this has no actual security consequence: it grants
  no real access, since `Contactar`'s server-side gate (`createCheckoutSessionAction`) is
  re-checked independently of this banner's state on every click. Confirmed this is purely
  informational, not a trust boundary.
- `window.location.href = checkoutUrl` (the Stripe hand-off) only ever receives a URL that
  originated from `createCheckoutSessionAction`'s own server response — the component never
  constructs or accepts a redirect target from any other client-controlled input.
- No secrets in source; `check:secrets` confirms no server-only secret is exposed
  client-side.

## Test Coverage Observations

- `tests/components/familia/paywall-gate.test.tsx` (8 tests) meaningfully covers: FAM-08's
  default content/generic offer copy, both dismiss paths (✕ and "Cancelar"), advancing to
  FAM-09 on a successful entitlement check without unmounting the shared dialog shell, the
  inline-error-without-losing-place path, the non-dismissible-during-processing states for
  *both* the entitlement-check request (`isPending`) and the confirm-redirect
  (`confirming`) — this directly and correctly verifies the "non-dismissible during payment
  processing" acceptance criterion for both request phases the story called out — the
  actual `window.location.href` redirect assignment, and the fresh-open state reset. This
  is genuine behavioral coverage, not count-padding.
- `tests/components/familia/checkout-return-banner.test.tsx` (5 tests) covers the
  no-param/success/cancel/mixed-param/unrecognized-value cases and verifies
  `history.replaceState` strips only the `checkout` param while preserving others — good
  coverage of the query-param logic itself, but (per Important Issue #1) RTL's `render()`
  never exercises an actual SSR-then-hydrate pass, so it cannot and does not catch the
  hydration-mismatch risk.
- `tests/components/familia/contact-button.test.tsx` and
  `candidate-detail-actions.test.tsx` confirm the button now opens `PaywallGate` instead of
  calling `createCheckoutSessionAction` directly (correctly verifying `ContactButton` no
  longer performs the E5-01 interim direct-to-Stripe redirect) and that both
  desktop/mobile action rows render functional favorite + contact controls.
- Gap: no test for the `already_entitled` step (Important Issue #3) and no test for
  `blocked_unverified`/other non-`checkout_created` statuses beyond the generic `"error"`
  case already covered.

## Acceptance Criteria Assessment

| # | Acceptance Criterion (`implementation-plan.md` E5-03 + referenced specs) | Verdict |
|---|---|---|
| 1 | Matches `UI-SPEC.md` FAM-08 layout/content/states (candidate context row, headline offer copy, "qué incluye" list, primary/secondary actions, `LockSimple` icon in `primary-50` circle, default/loading/error states) | PASS |
| 2 | Matches `UI-SPEC.md` FAM-09 layout/content (same dialog shell as FAM-08, order-summary line item, "Confirmar pago"/"Cancelar") to the extent achievable given Stripe Hosted Checkout owns the actual payment fields | PASS — legitimate, well-documented scope narrowing; the app's own FAM-09 surface (order summary + bridging note + redirect) is exactly what UX-spec itself calls "provider-dependent, out of this spec's scope" |
| 3 | Generic, not-yet-finalized offer copy note honored (no invented specifics on capped-vs-uncapped, per-necesidad-vs-account-wide) | PASS |
| 4 | Non-dismissible during payment processing (both the entitlement-check request and the confirm-redirect state) | PASS — independently verified via both the source (`locked = isPending \|\| confirming` gating the ✕/Cancelar buttons) and the two dedicated tests exercising each phase |
| 5 | `ContactButton` no longer calls the Stripe redirect directly; routes through the real `Contactar` → FAM-08 → FAM-09 flow | PASS |
| 6 | FAM-09 success → FAM-10 auto-advance | UNCERTAIN — correctly deferred (FAM-10/E5-04 doesn't exist); `CheckoutReturnBanner` is a reasonable interim substitute, but see Important Issue #1 for a correctness defect in how it's implemented |
| 7 | FAM-06's "otherwise routes straight to FAM-10" for an already-entitled family | FAIL as literally specified (unavoidable — FAM-10 doesn't exist), but the substitute behavior (opening the paywall dialog before revealing already-entitled status) is a real UX regression from E5-01's already-approved interim behavior and was not recorded as a formal exception the way E5-01's was. See Important Issue #2. |

## Required Changes

None block merge/VERIFIED status outright — all three Important Issues are fixable as
non-blocking follow-ups given the story's genuine dependency gaps (FAM-10/E5-04 not yet
built), but should be addressed before this pattern compounds:

1. Fix `CheckoutReturnBanner`'s hydration-mismatch risk by moving the `window.location`
   read from the `useState` lazy initializer into a `useEffect`, matching the codebase's
   existing pattern everywhere else `window` is touched.
2. Record the already-entitled-opens-the-paywall-first interim behavior explicitly in
   `agent/DECISIONS.md`/`agent/BACKLOG.md`'s E5-03 entry (mirroring E5-01's precedent for
   its own interim redirect), and consider passing a server-computed
   `initialAlreadyEntitled` flag into `PaywallGate` so entitled families skip the payment
   offer screen entirely rather than round-tripping through it.
3. Add test coverage for the `already_entitled` step.
