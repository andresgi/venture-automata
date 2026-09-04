# Functional QA

## Verdict

PASS_WITH_MINOR_ISSUES

The real `Contactar` -> FAM-08 (paywall) -> FAM-09 (checkout) flow is implemented
correctly and matches the literal, achievable acceptance criteria: non-dismissible during
both the entitlement-check request and the final Stripe redirect, inline error handling
that doesn't lose place, reset-on-reopen, and the newly-added `already_entitled` test
coverage all independently verify as correct. All automated checks pass (329/329 tests,
clean lint/typecheck/secrets/build). Code Review's Important Issue #1 (hydration mismatch)
is genuinely fixed. One new, non-blocking behavioral issue was found in the process of
verifying that same fix (BUG-001 below) and Code Review's Important Issue #2 (already-
entitled families see the paywall offer before being told they don't need to pay) remains
present as an accepted interim narrowing, consistent with how the orchestrator framed it.

## Environment

- Repository: `projects/nanamex`
- Platform: web-only Next.js 16.3.4 / TypeScript / Vitest
- Test date: 2026-09-04
- QA ownership: per `config/CONSTRAINTS.md` "QA Ownership", mobile QA is not applicable
  (web only, no native app in V1); web Functional QA is agent-driven. No manual-QA gate
  applies to this story.
- No browser/E2E automation tool (Playwright etc.) is available in this environment;
  DOM-level behavior was verified via Vitest/RTL (existing + inspected suites) and via
  direct source-level tracing of React effect/render sequencing and documented Next.js App
  Router `useSearchParams`/`router.replace` semantics, cross-checked against the codebase's
  own existing `UnauthorizedBanner` precedent and this route's `force-dynamic` config and
  production build output. This is noted as a methodology limitation for finding BUG-001
  specifically — see that entry.
- Reviewed: `engineering/implementation-plan.md` E5-03 entry, `design/UI-SPEC.md` FAM-08/
  FAM-09, `design/UX-spec.md` Decision 4 and FAM-08/09 entries, `agent/reviews/
  code-E5-03-review.md`, `agent/BACKLOG.md` E5-01/E5-02 entries, `components/familia/
  paywall-gate.tsx`, `components/familia/checkout-return-banner.tsx`, `components/familia/
  contact-button.tsx`, `components/familia/candidate-detail-actions.tsx`, `app/familia/
  necesidad/[id]/candidatas/[ninId]/page.tsx`, `components/auth/unauthorized-banner.tsx`
  (the pattern the fix claims to match), and all associated test files.

## Test Cases

### TC-001 — Full happy path: Contactar -> FAM-08 -> FAM-09 -> Stripe redirect
- **Scenario:** Click Contactar, verify FAM-08 offer renders candidate name/photo/trust
  badge and generic MX$299 copy, click Continuar a pago (mocked
  `createCheckoutSessionAction` resolves `checkout_created`), verify it advances to FAM-09's
  order summary without unmounting the dialog shell, click Confirmar pago, verify
  `window.location.href` is set to the real `checkoutUrl`.
- **Expected:** Each step as described; same `role="dialog"` element persists across steps.
- **Actual:** Confirmed by direct source reading (`paywall-gate.tsx` renders one `<div
  role="dialog">` shell with `step`-gated children, never remounting) and by the existing
  passing tests `"renders FAM-08's offer content..."`, `"advances to FAM-09's checkout
  step..."`, and `"redirects to Stripe's checkout URL..."` in
  `tests/components/familia/paywall-gate.test.tsx`, all independently re-run and passing.
- **Result:** PASS

### TC-002 — Non-dismissible while requests are in flight
- **Scenario:** Click Continuar a pago with the action promise unresolved; verify ✕/Cancelar
  are disabled. Click Confirmar pago; verify ✕/Cancelar are disabled during the redirect.
- **Expected:** Both request phases (`isPending`, `confirming`) lock the dialog.
- **Actual:** `locked = isPending || confirming` gates both the ✕ button (`disabled={locked}`)
  and each step's own Cancelar button. Verified via
  `"blocks close/cancel while the entitlement check is pending..."` and `"redirects to
  Stripe's checkout URL and becomes non-dismissible on Confirmar pago"`, both passing.
  Escape-key dismissal is also gated (`handleClose` early-returns when `locked`).
- **Result:** PASS

### TC-003 — Entitlement-check failure: inline error, stays on paywall step, no crash
- **Scenario:** `createCheckoutSessionAction` resolves `{status: "error", message}` or
  rejects entirely.
- **Expected:** Inline `role="alert"` error shown, step remains `"paywall"`, no unhandled
  exception.
- **Actual:** `handleContinue`'s `.then` sets `error` and falls through (no `setStep` call,
  so `step` stays `"paywall"`); `.catch` sets a generic `GENERIC_ERROR_MESSAGE` for
  network/unexpected rejection, so a thrown/rejected promise is also handled, not just a
  resolved error status. Verified via `"shows an inline error banner without losing place..."`
  (resolved-error case). The `.catch` path (rejected promise) is not covered by an explicit
  test but is straightforward and symmetric with the resolved-error path — verified by
  direct code reading only.
- **Result:** PASS

### TC-004 — already_entitled path
- **Scenario:** `createCheckoutSessionAction` resolves `{status: "already_entitled",
  message}`.
- **Expected:** Message shown, "Entendido" closes the gate, this is distinct from the FAM-08
  offer step.
- **Actual:** Code Review's Important Issue #3 (no test coverage) was fixed — `"shows the
  already-entitled step and closes the gate on Entendido"` now exists in
  `paywall-gate.test.tsx`, asserts the offer copy is no longer present and that clicking
  Entendido calls `onClose`. Re-ran independently: passes. This does **not** address Code
  Review's separate Important Issue #2 (the paywall offer is still shown first, before the
  entitlement check reveals `already_entitled` — see "Regression Results" / accepted
  finding below); it only confirms the `already_entitled` step itself, once reached, behaves
  correctly.
- **Result:** PASS

### TC-005 — Hydration-mismatch fix (Code Review Important Issue #1)
- **Scenario:** Verify `CheckoutReturnBanner` no longer reads `window.location` in a
  `useState` lazy initializer (which produced server/client render divergence on the exact
  request that matters — a real Stripe-redirect return).
- **Expected:** URL state derived only from `next/navigation`'s `useSearchParams()`, which is
  SSR-safe (server render of a Client Component using this hook renders based on the
  request's actual search params, no `window` access, no divergent lazy-init branch).
- **Actual:** Confirmed `checkout-return-banner.tsx` no longer contains `window.location` or
  a `useState` initializer function at all — `state` is now derived directly from
  `searchParams.get("checkout")` on every render, matching `components/auth/
  unauthorized-banner.tsx`'s established pattern exactly (`isVisible =
  searchParams.get(...) === ...`, no local mismatch-prone state). `npm run build` produces a
  clean production build with `/familia/necesidad/[id]/candidatas/[ninId]` correctly listed
  as a dynamic (`ƒ`) route — no missing-Suspense-boundary warning, consistent with the
  page's `export const dynamic = "force-dynamic"` bypassing static-generation requirements
  for `useSearchParams`. This is a genuine, correct fix for the specific hydration-mismatch
  defect Code Review flagged.
- **Result:** PASS

### TC-006 — Return-trip banner: query-param stripping, no infinite loop, and post-strip UX
- **Scenario:** `?checkout=success` and `?checkout=cancel` render the correct banner text;
  the `useEffect` calling `router.replace` to strip the param does not loop; verify the
  overall behavior of the auto-strip-on-mount effect.
- **Expected (per task framing):** Param stripped "without a full page reload"; no infinite
  loop from the effect/`router.replace` interaction.
- **Actual — no infinite loop, confirmed:** the effect's dependency array is `[state]`
  (deliberately not `[searchParams, router]`, with an eslint-disable comment explaining
  why). Trace: mount with `raw="success"` -> `state="success"` -> effect fires once, calls
  `router.replace`. Once the param is actually stripped and a re-render occurs, `raw` is
  `null` -> `state=null` -> the effect's dependency changes from `"success"` to `null`,
  re-running the effect, but it immediately early-returns (`if (!state) return;`) without
  calling `router.replace` again. No loop is possible; confirmed both by this trace and by
  the existing passing tests (`replace` called exactly once per case in
  `checkout-return-banner.test.tsx`).
- **Actual — post-strip UX, a real but non-blocking behavioral quality issue found (see
  BUG-001):** the effect calls `router.replace` (the App Router client navigation API, which
  triggers a new server render for a `force-dynamic` route/pathname) automatically on mount,
  rather than only on explicit user action the way `UnauthorizedBanner`'s equivalent
  `dismiss()` does. On a real Stripe return trip this means the URL-strip is not a
  client-only cosmetic edit — it triggers a fresh RSC round-trip that re-executes the entire
  `CandidateProfilePage` server function (including re-querying candidate/necesidad data and
  re-calling the `record_candidate_profile_view` RPC a second time). The RPC is confirmed
  idempotent (`on conflict (necesidad_id, ninera_id) do nothing`, `db/migrations/
  20260903000012_candidate_profile_view.sql:45`), so there is no data-correctness bug. But
  this is a real deviation from "without a full page reload" as commonly understood for this
  kind of query-param cleanup, and it means the "Contacto desbloqueado" confirmation is
  displayed only until that round-trip resolves and swaps in the post-strip render (at which
  point the banner disappears, since its visibility is derived purely from the current
  `searchParams`, not from any local "I already showed this" state) — the user gets a
  necessarily transient, network-round-trip-gated glimpse of the confirmation rather than a
  stable one. I could not verify the actual visible duration/flicker in a real browser
  (no Playwright/browser automation available in this environment — see Environment
  section); this finding is based on tracing documented Next.js App Router `router.replace`
  semantics against this route's `force-dynamic` config, not a captured screenshot/video.
  Flagging as BUG-001 for a human or Visual QA pass with real browser tooling to confirm the
  actual on-screen duration and decide whether it's acceptable.
- **Result:** PASS (no-loop requirement) / see BUG-001 (post-strip UX)

### TC-007 — Reset-on-reopen
- **Scenario:** Trigger an error on the paywall step, close the gate, reopen it.
- **Expected:** Returns to `"paywall"` step with no stale error/state.
- **Actual:** `useEffect` on `[open]` calls `resetToDefault()` whenever `open` transitions to
  `true`, clearing `step`/`isPending`/`confirming`/`error`/`alreadyEntitledMessage`/
  `checkoutUrl`. Confirmed this matches real production wiring: `ContactButton` always keeps
  `PaywallGate` mounted and toggles the `open` boolean via `useState` (never conditionally
  unmounts/remounts `PaywallGate` itself), which is exactly what the reset test's
  `rerender(...open={false})` / `rerender(...open={true})` sequence exercises. Verified via
  `"resets back to FAM-08's default state each time it is freshly opened"`, passing.
- **Result:** PASS

### TC-008 — ContactButton no longer redirects directly (E5-01 interim removed)
- **Scenario:** Confirm `ContactButton` opens `PaywallGate` and no longer calls
  `createCheckoutSessionAction`/redirects directly on click.
- **Expected:** Button click only sets local `open` state; all server-side calls happen
  inside `PaywallGate`.
- **Actual:** `contact-button.tsx`'s `onClick` is `() => setOpen(true)` only; no import of
  `createCheckoutSessionAction` in this file. Confirmed via
  `tests/components/familia/contact-button.test.tsx` and
  `candidate-detail-actions.test.tsx`, both passing.
- **Result:** PASS

## Bugs

### BUG-001 — Auto-stripping the `?checkout` param on mount triggers a full server
round-trip on a `force-dynamic` route, making the confirmation banner's visible duration
network-dependent rather than stable
- **Severity:** Minor (UX quality / performance, not a data-correctness or security defect)
- **Reproduction:** Land on `/familia/necesidad/[id]/candidatas/[ninId]?checkout=success`
  (the real return URL Stripe redirects to per `actions/entitlements.ts`'s `successUrl`).
  `CheckoutReturnBanner`'s `useEffect` fires on mount and immediately calls
  `router.replace("?", { scroll: false })` to strip the param. Because the page is `export
  const dynamic = "force-dynamic"`, this App Router client navigation is not a purely local/
  shallow URL edit — it triggers a fresh request that re-executes `CandidateProfilePage`
  server-side (re-running its Supabase queries and the `record_candidate_profile_view` RPC a
  second time, confirmed idempotent so no data corruption results). Once that round-trip's
  render commits, `searchParams.get("checkout")` is `null` and the banner's derived `state`
  becomes `null`, so the "Contacto desbloqueado"/"Pago cancelado" message disappears.
- **Expected:** Either (a) the confirmation persists for a stable, predictable duration
  regardless of network conditions (e.g., only stripped on next real navigation, matching
  `UnauthorizedBanner`'s user-action-triggered `dismiss()` rather than an automatic
  effect-on-mount), or (b) if an automatic strip is intended, it should not require a full
  server round-trip to avoid making the confirmation's visible lifetime dependent on
  RSC-fetch latency.
- **Actual:** The strip happens automatically and immediately via `useEffect`, coupled to a
  full server re-render because `router.replace` is a real App Router navigation on a
  `force-dynamic` route.
- **Affected requirement:** Not a literal `implementation-plan.md` E5-03 acceptance
  criterion violation (E5-03's own criteria don't mention persistence duration), but is
  directly relevant to this story's own task framing ("verify the query param is stripped
  without a full page reload") and to `design/UI-SPEC.md`'s FAM-09 intent of "a brief
  confirmation... before auto-advancing" — the confirmation should be reliably visible for
  its intended purpose, not incidentally cut short by an unrelated network round-trip. Could
  not be visually confirmed in this environment (no browser automation tool available);
  recommend a human or Visual QA pass with real browser tooling confirm actual on-screen
  duration before deciding whether this needs a follow-up fix.

## Regression Results

- `npm test -- --run --no-file-parallelism` — PASS, 47 files / 329 tests (matches the task's
  expected count exactly)
- `npm run lint` — PASS, clean
- `npm run typecheck` (`next typegen && tsc --noEmit`) — PASS, clean
- `npm run check:secrets` — PASS, no server-only secret exposed client-side
- `npm run build` — PASS, clean production build (Turbopack); `/familia/necesidad/[id]/
  candidatas/[ninId]` listed as a dynamic (`ƒ`) route, no Suspense-boundary or hydration
  warnings
- `npm run test:db` — not run; confirmed not relevant (no new/modified migration files for
  this story — the only untracked migration file, `db/migrations/
  20260904000016_finalize_stripe_payment.sql`, belongs to E5-02, already VERIFIED)
- Code Review's three Important Issues independently re-verified post-fix: #1 (hydration
  mismatch) genuinely fixed — see TC-005; #3 (missing `already_entitled` test) genuinely
  fixed — see TC-004; #2 (already-entitled families see the paywall offer first) remains
  present as documented, accepted interim behavior per the task framing — not re-litigated
  here since it was already explicitly accepted rather than silently left unresolved.

## Recommendation

Accept E5-03 as functionally verified. The core FAM-08/FAM-09 flow — happy path,
non-dismissibility during both request phases, inline error handling without losing place,
`already_entitled` handling, and reset-on-reopen — all independently verify correct against
real production wiring (not just the isolated component tests). Code Review's hydration-
mismatch fix is confirmed correct and does not introduce the naive "flash of wrong content"
render-cycle bug. File BUG-001 (auto-strip-triggers-full-reload UX timing risk) as a
non-blocking follow-up — recommend a human/Visual QA pass with real browser tooling to
confirm actual on-screen banner duration before deciding whether it needs a fix (e.g.
switching to a user-dismiss or timer-based clear instead of an automatic on-mount effect).
Recommend marking E5-03 VERIFIED with BUG-001 tracked separately, consistent with how
BUG-001 was handled in the E5-02 functional QA report (non-blocking, tracked, not gating
VERIFIED).

## Post-Review Fix (orchestrator, 2026-09-04)

BUG-001 was fixed directly rather than deferred: `CheckoutReturnBanner` now pins its
`success`/`cancel` state in local `useState` at mount (derived from `useSearchParams()`,
still SSR-safe/hydration-safe) so the confirmation stays visible regardless of the URL
round-trip, and the `checkout` param is now stripped via a `window.setTimeout` after a
fixed `DISMISS_DELAY_MS = 4000` instead of immediately on mount — matching this codebase's
existing `Toast` auto-dismiss convention (`components/shared/toast.tsx`, `durationMs =
4000`). `tests/components/familia/checkout-return-banner.test.tsx` updated to use fake
timers and assert the banner remains visible until the delay elapses. Re-ran
lint/typecheck/329 tests/check:secrets/build — all clean.
