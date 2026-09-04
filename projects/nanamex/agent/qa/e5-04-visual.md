# Visual QA — E5-04 / FAM-10

## Verdict

**REVISION_REQUIRED** — source-level visual review found integration/navigation defects. The core FAM-10 form, post-success contact reveal, loading affordance, error surface, and responsive sizing are otherwise reasonable. Do not mark VERIFIED or merge.

## Scope and limitations

- Compared the current FAM-10 route/form and FAM-06 → paywall → checkout-return wiring with `design/UX-spec.md`, `design/UI-SPEC.md`, `design/UI-SYSTEM.md`, and the E5-04 implementation/functional QA notes.
- Reviewed intended behavior at 375, 430, 768, and 1440px from responsive classes/source. No browser, screenshot, or live authenticated render tooling is available in this environment, so these are not pixel-confirmed viewport observations.
- QA ownership is web agent-driven; the project is web-only, so no native-mobile manual-QA stop applies.
- No production code was modified.

## Passing checks

- Before a successful contact result, FAM-10 does not receive or render the candidate phone. Phone/WhatsApp is revealed only in the `contacted`/`already_contacted` result block; this satisfies the requested disclosure boundary.
- The message field is optional, capped at 1000 characters, and uses a full-width textarea with a visible label. `Confirmar solicitud` is 44px high and the back link is a 44px minimum target.
- Form submit has an inline spinner, disables the textarea and CTA while pending, and exposes failures through `role="alert"` without leaving the page.
- The FAM-10 content column is constrained to 640px, uses 16px mobile / 24px `sm` horizontal padding, and uses the documented type tokens. The layout should remain usable at 375/430/768 and is not excessively wide at 1440.
- FAM-06 mobile actions and the paywall controls retain 44px targets. The paywall's earlier mobile-scroll issue is fixed in the current source (`overflow-y-auto` on the dialog shell).

## Findings

### E5-04-V01 — Successful checkout does not enter FAM-10 automatically

- **Severity:** Medium
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-06 → FAM-08/FAM-09 return flow
- **Expected:** Per FAM-09/FAM-10 UX, a successful payment should redirect to the specific candidate's FAM-10 request screen (with a brief success confirmation before/around the transition).
- **Actual:** `CheckoutReturnBanner` remains on FAM-06 after `?checkout=success` and offers a manually clicked `Solicitar entrevista` link. The route exists now, but the return flow does not navigate to it automatically.
- **Reproduction:** From FAM-06, open `Contactar`, complete the paywall/Stripe return, and inspect the landing page at `?checkout=success`; FAM-06 remains visible until the user taps the banner link.

### E5-04-V02 — FAM-10 has no Cancelar action

- **Severity:** Medium
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-10 Solicitar entrevista
- **Expected:** FAM-10 specifies `Cancelar` as an explicit action and an exit path back to the candidate context.
- **Actual:** The screen only exposes `Volver al perfil` above the heading. The form has no Cancelar CTA adjacent to the message/submit controls, making the documented form exit less discoverable and inconsistent with FAM-08/FAM-09.
- **Reproduction:** Open an entitled candidate's `/contactar` route and inspect the actions below the message field.

### E5-04-V03 — Successful FAM-10 confirmation is a terminal state instead of navigating onward

- **Severity:** Medium (dependency-limited)
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-10 success / FAM-11 handoff
- **Expected:** Successful confirmation shows a brief confirmation and exits to FAM-11, as specified by UX/UI; the request should not leave the user on a dead-end confirmation screen.
- **Actual:** `ContactRequestForm` replaces the form with confirmation and revealed phone only. There is no navigation CTA or redirect to FAM-11. FAM-11 is explicitly deferred to E6, but the current FAM-10 implementation still has no forward handoff.
- **Reproduction:** Submit a valid optional-message request and observe the success state; it remains on FAM-10 with no next-step action.

### E5-04-V04 — Already-contacted state is not initialized when the durable contact has no phone

- **Severity:** Minor
- **Viewport:** 375, 430, 768, 1440px
- **Screen:** FAM-10 already-contacted state
- **Expected:** An established contact should render the already-contacted success/contact state regardless of whether the candidate has a phone; the state must not fall back to a new request form.
- **Actual:** The route converts a known null phone to `undefined` (`initialPhone = ... ?? undefined`). `ContactRequestForm` uses `initialPhone !== undefined` as its established-contact discriminator, so a durable contact with no phone renders the editable message form instead of the already-contacted state.
- **Reproduction:** Use an established contact whose candidate `profiles.phone` is null, open FAM-10, and observe the new-request textarea/CTA rather than the already-contacted confirmation.

## Limitations / deferred behavior

- Notification-delivery failure UI is not present; E5-04 functional QA records notification delivery as an approved Epic 10 handoff, so it was not treated as an E5-04 visual defect.
- There is no dedicated `loading.tsx` for the FAM-10 route. Button-level loading is implemented; route-load skeleton behavior could not be rendered or validated without browser tooling.
- FAM-11 UI is outside E5-04 scope, but the missing FAM-10 forward handoff remains visible and should be resolved when the dependency is available (or explicitly documented as an accepted interim flow).
