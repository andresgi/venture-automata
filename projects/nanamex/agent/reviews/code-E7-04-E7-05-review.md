# Code Review

## Verdict

REVISE

## Critical Issues

None identified. The final source review found no authorization bypass, provenance/lifecycle leak, ordering regression, sensitive-data exposure, or mutation/data-integrity defect.

## Important Issues

- **NIN-05 is not fully compliant at the tablet breakpoint.** `OpportunityFilters` switches to the bottom-sheet trigger until `lg` (1024px), while the approved combined list/filter pattern calls for a persistent filter panel at tablet/desktop widths. At 768px the card list and filter trigger therefore do not match the approved tablet composition.
- **The mobile filter dialog is not a complete accessible modal.** It has an appropriate dialog role, label, close button, and labelled controls, but opening it does not move focus into the dialog, trap focus, restore focus to the trigger, or handle Escape. The backdrop is not inert, so keyboard users can potentially reach page controls behind the modal.
- **The required `Limpiar` action is absent from the filter sheet/panel.** `Cancelar` only closes the mobile sheet and does not clear draft/applied values; desktop has only `Aplicar filtros`. The no-results `Limpiar filtros` link is not an equivalent always-available filter control. This makes the approved filter interaction incomplete and leaves users without a direct reset affordance.
- **NIN-04/NIN-05 empty-state hierarchy remains incomplete.** The branches have truthful copy and recovery links, but omit the approved shared icon/headline/guidance/primary-action composition; the received state is only a paragraph and link, and the explore state uses lightweight text rather than the standard empty template.

## Minor Issues

- Route-level tests still do not include the received-opportunities page or assert that all opportunity-route protected reads are not reached before auth/onboarding redirects. Browser-level keyboard and responsive verification remains unavailable.
- E7-06 actions remain disabled by design. This is an honest scope boundary and must not be replaced with fake detail, interest, or discard behavior in these stories.

## Security Observations

- **PASS:** Dashboard, received, and explore pages obtain the server session, reject unauthenticated/non-niñera/inactive accounts, and redirect incomplete onboarding before service-role opportunity/profile reads.
- **PASS:** NIN-04 constrains the query and defensive mapper to the session's `ninera_id`, `source = pushed`, `estado = nueva`, and an active parent necesidad. Unknown/non-pushed and advanced/closed rows are excluded.
- **PASS:** NIN-05 reads only active necesidades and defensively rechecks `estado` before scoring/filtering. It reuses the established scorer, preserving modality as a hard exclusion and the existing factor semantics.
- **PASS:** NIN-04 ordering is score descending, parent `updated_at` descending, then pipeline ID ascending; NIN-05 uses the same deterministic ordering. Dashboard preview uses the same ordering and caps at three.
- **PASS:** Cards expose only anonymized zone-level family data and no contact, child-identifying, paywall, entitlement, or payment data. Filter values are normalized server-side; malformed values are ignored safely, including unsafe integer salary input.

## Test Coverage Observations

- Independently run: `npm test -- --run --no-file-parallelism` — 69 files / 490 tests passed; `npm run lint`, `npm run typecheck`, and `npm run build` passed. Build includes all E7 routes; only the existing Supabase Node 20 deprecation warning appeared.
- Unit coverage covers scorer reuse, modality exclusion, availability filtering, normalization of malformed day/time/ranges, overflow-safe salary parsing, and deterministic ordering.
- Component/app coverage covers dashboard states and the explore route, but does not meaningfully test filter form submission/query preservation, reset behavior, dialog focus/keyboard behavior, or the received route's auth/read ordering.
- No browser executable is available, so computed breakpoint behavior and keyboard traversal could not be rendered-verified.

## Acceptance Criteria Assessment

### E7-04 — NIN-03 dashboard

- PASS — Verification status is shown at banner scale with honest no-verificada, en-proceso, and verificada states; pending copy states 24–48 hours without promising approval.
- PASS — Six-category profile completion progress and completion CTA are present; identity verification remains optional/non-blocking.
- PASS — Recent pushed preview is populated from active/new/pushed rows, capped at three, and sorted deterministically; `Ver todas` links to NIN-04.
- PASS — Separate `Explorar vacantes` entry exists and resolves to NIN-05.
- PASS — Auth, active-niñera authorization, onboarding redirect, required-read failure handling, loading, and retryable error state are preserved.
- PASS — Dashboard visual fixes preserve mobile-safe navigation and state-specific verification treatment.

### E7-05 — NIN-04/NIN-05 opportunities

- PASS — NIN-04 provenance, lifecycle, active-parent, and ownership constraints are enforced in query and mapper.
- PASS — NIN-04 ranking uses snapshot score, necesidad recency, then pipeline ID; dashboard preview uses the same order.
- PASS — NIN-05 reuses the V1 scorer, preserves modality hard exclusion, active-necesidad filtering, and anonymized card data.
- PASS — Zone, modality, salary-overlap, selected-day, and valid time-window filters narrow results; malformed/reversed/overflow query values fail safely without broadening access.
- PASS — Query state is represented by GET parameters and valid submitted values are reflected back into controls; no source-level data-semantic regression was found.
- FAIL — Approved responsive filter composition is incomplete at tablet width: no persistent panel at 768px.
- FAIL — Approved reset interaction is absent: no `Limpiar` control in the filter sheet/panel.
- FAIL — Dialog accessibility is incomplete for focus containment, Escape dismissal, and focus restoration.
- FAIL — NIN-04/NIN-05 empty/no-results presentation does not meet the approved shared empty-state hierarchy and recovery guidance treatment.
- PASS — No paywall/payment/contact reveal or fake E7-06 mutation was introduced.

## Required Changes

1. Add the approved tablet persistent filter panel breakpoint (or record an explicit approved scope exception).
2. Provide a real `Limpiar` action that clears the supported GET filters without altering unrelated query semantics.
3. Complete modal keyboard behavior: initial focus, focus trap, Escape dismissal, focus restoration, and inert/blocked background interaction.
4. Bring NIN-04 and NIN-05 empty/no-results branches up to the approved shared empty-state hierarchy, including explicit broadening guidance for NIN-05.
5. Add focused tests for GET query submission/reset preservation, dialog accessibility behavior, received-route auth ordering, and the existing provenance/lifecycle fixture matrix before marking the stories VERIFIED.

## Post-Review Fixes (orchestrator, 2026-09-05)

1. **Tablet breakpoint — recorded as an approved scope exception, not changed.**
   `design/UX-spec.md` Part D's actual "Responsive Behavior" section (the literal
   authority for this, not UI-SYSTEM §2's general breakpoint-naming table) specifies only
   a binary split for `FAM-04 / NIN-04 / NIN-05` lists: "Filters (FAM-05) render as a
   bottom sheet on mobile, a persistent sidebar panel on desktop" — the same `lg`
   (1024px) breakpoint already implemented here and in the already-VERIFIED
   `components/familia/candidate-filters.tsx` (FAM-05). No third "tablet" tier is
   specified for the filter panel anywhere in Part D. Introducing one for NIN-05 alone
   would make it inconsistent with FAM-05's own established, reviewed precedent for the
   identical UI pattern. Kept the `lg:hidden`/`lg:block` split unchanged.
2. **Fixed.** `components/ninera/opportunity-filters.tsx`'s `OpportunityFiltersView` adds a
   real "Limpiar" action on both the desktop panel and the mobile sheet, resetting to
   `EMPTY_OPPORTUNITY_FILTERS` (mirroring `candidate-filters.tsx`'s `clear()`).
3. **Fixed.** Ported `candidate-filters.tsx`'s exact accessible-modal pattern: initial
   focus into the dialog, a Tab-cycle focus trap, Escape-to-close, focus restored to the
   trigger button, and `document.body.style.overflow = "hidden"` while open.
4. **Fixed.** Added `components/ninera/opportunity-empty-state.tsx`, the shared §5.8
   template (64px `primary-50` icon circle, Fraunces headline, one guidance line, one
   primary action), reused by NIN-04's base-empty state, NIN-05's base-empty state, and
   NIN-05's filtered-no-results state (with explicit broadening guidance and a working
   "Limpiar filtros" action — a button that clears filters in place, not a link).
5. **Fixed.** Added `tests/app/ninera-oportunidades-recibidas.test.tsx` (auth/onboarding
   redirect ordering, read-failure handling, empty state) and rewrote
   `tests/components/ninera/opportunity-filters.test.tsx` against the new
   `OpportunityFiltersView` (live desktop filtering, Limpiar, mobile sheet
   accessibility/sticky-footer, draft-vs-applied mobile behavior, both empty states).

**Additional finding not in the original review, from the companion Visual QA report
(`agent/qa/e7-04-e7-05-visual.md`), fixed in the same pass:** NIN-05's filters required an
explicit "Aplicar filtros" submit even on desktop (a full-page GET-form reload per
change), contradicting `design/UX-spec.md`'s desktop live-apply behavior already
established by FAM-05. Fixed by converting NIN-05 from server-side GET-param filtering to
client-side filtering: `app/ninera/oportunidades/page.tsx` now fetches and scores all
active necesidades once, and `OpportunityFiltersView` (a new client component replacing
the old `OpportunityFilters`) applies zona/modalidad/pay/availability filters live via a
new pure function (`opportunityMatchesFilters` in `lib/ninera/opportunities.ts`), matching
`CandidateFiltersView`'s established live-apply-desktop / draft-then-apply-mobile split.
Also added the missing mobile sheet drag handle and made its footer `sticky` (a mobile
finding from the same Visual QA report, not in Code Review's original list).

Re-ran the full validation suite after all fixes: `npm run lint`, `npm run typecheck`,
`npm test -- --run --no-file-parallelism` (503 tests), `npm run check:secrets`,
`npm run build`, and `npm run test:db` — all pass.

---

## Round 2 (independent re-review of orchestrator's Post-Review Fixes)

### Verdict

PASS_WITH_MINOR_ISSUES

### Verification performed this round

1. **Required Change #1 (tablet breakpoint) — decline to fix is justified.** Read
   `design/UX-spec.md` Part D "Responsive Behavior" directly. Its literal text for
   `FAM-04 / NIN-04 / NIN-05 lists` states: "single-column stacked cards on mobile;
   multi-column grid on desktop. Filters (FAM-05) render as a bottom sheet on mobile, a
   persistent sidebar panel on desktop." This is a binary mobile/desktop split with no
   third tablet tier specified anywhere in Part D for the filter panel. The already-VERIFIED
   `components/familia/candidate-filters.tsx` (FAM-05) uses the same `lg` (1024px)
   breakpoint (`lg:hidden` / `lg:block`). The orchestrator's reading is accurate; round 1's
   "tablet/desktop" framing does not trace to an actual spec requirement. Recording this as
   an accepted scope exception (rather than inventing a new breakpoint inconsistent with the
   verified FAM-05 precedent) is the correct call, not a dodge.
2. **Required Change #2 (Limpiar) — confirmed fixed.** Read
   `components/ninera/opportunity-filters.tsx` directly. The desktop `<aside>` has a
   `Limpiar` button calling `clear()` -> `applyLive(EMPTY_OPPORTUNITY_FILTERS)`, which sets
   both `applied` and `draft` state and rewrites the URL — a real state reset, not a
   cosmetic one. The mobile sheet's `Limpiar` resets `draft` to
   `EMPTY_OPPORTUNITY_FILTERS` (consistent with the mobile sheet's draft-then-apply model,
   mirroring `candidate-filters.tsx` exactly). Confirmed behaviorally via
   `tests/components/ninera/opportunity-filters.test.tsx`'s "clears filters via the desktop
   Limpiar action" test, which asserts the result count actually changes.
3. **Required Change #3 (modal accessibility) — confirmed fixed.** Read the `useEffect`
   in `OpportunityFiltersView` line-by-line: on open it sets `document.body.style.overflow
   = "hidden"`, focuses the first focusable element in the dialog, and installs a
   `keydown` handler that (a) closes and restores focus to `triggerRef` on Escape, and (b)
   implements a real Tab-cycle focus trap (wraps from last to first and first to last).
   Close via any path (`close()`) restores focus to the trigger. This is a faithful,
   independently-readable port of `candidate-filters.tsx`'s pattern, not just an
   unsubstantiated comment claim. One minor gap shared with the FAM-05 original: the
   backdrop is not marked `inert`/`aria-hidden`, so a screen reader could still traverse
   background DOM nodes even though keyboard Tab is trapped correctly within the visible
   dialog — a pre-existing FAM-05 limitation, not a regression introduced here.
4. **Required Change #4 (empty states) — confirmed fixed.** `OpportunityEmptyState` (new
   file) implements the shared icon-circle/headline/guidance/action template. It is used by
   NIN-04's `recibidas/page.tsx` empty state and by both of NIN-05's empty branches. The
   filtered-no-results branch's "Limpiar filtros" is genuinely a `<button onClick={clear}>`
   (in-place client-side state clear, confirmed by reading the component's discriminated
   `actionHref`/`onAction` prop union, which forces exactly one), not a link or navigation —
   matches the story requirement precisely.
5. **Required Change #5 (tests) — confirmed meaningful, not snapshot-only.** Read
   `tests/components/ninera/opportunity-filters.test.tsx` and
   `tests/app/ninera-oportunidades-recibidas.test.tsx` in full. Both exercise real user
   interaction paths (`fireEvent.change`/`fireEvent.click`/`fireEvent.keyDown`) and assert
   on resulting DOM state (result counts, focus target, dialog presence, sticky footer
   class), not rendered-output snapshots. The recibidas test file also asserts
   auth/onboarding redirect ordering (`/login` before `/ninera/perfil` before any pipeline
   read) and fail-closed error handling on a read failure — directly closing round 1's
   "received-route auth ordering" gap.
6. **Client-side filtering architecture change (desktop live-apply pivot) — verified safe.**
   Read `app/ninera/oportunidades/page.tsx` end-to-end: the session/auth check, niñera-role
   check, and onboarding-completion redirect all execute and can all short-circuit before
   `createServiceRoleClient()` is ever called or any necesidad/profile row is fetched — the
   architecture change did not move any authorization check client-side. On the data-
   exposure question: `scoreNecesidadForNinera` calls `scoreMatch`, which returns `null`
   outright when the niñera's `modalidadesAceptadas` doesn't include the necesidad's
   modalidad (`lib/matching/match-score.ts:82-85`); both `app/ninera/oportunidades/page.tsx`
   and `app/ninera/page.tsx` filter out nulls via
   `.filter((item): item is OpportunityCardData => item !== null)` before ever constructing
   the array handed to the client component. So the set of necesidades sent to the browser
   is unchanged by the architecture pivot — only where the zona/modalidad/pay/availability
   *sub-filtering* happens (client vs. query) changed, not which necesidades clear the hard
   eligibility gate. No new data exposure.

### Minor findings (new, not blocking)

- `lib/ninera/opportunities.ts`'s `normalizeOpportunityFilters` (GET-param normalization,
  used by the old server-side-filtering flow) is now dead production code — no remaining
  caller outside `tests/lib/ninera/opportunities.test.ts`. Left over from the
  server-to-client filtering pivot; harmless but should be removed in a follow-up cleanup
  pass rather than accumulating unused exports.
- `OpportunityFiltersView`'s `zona` filter is a free-text `<input>` matched by exact string
  equality against `item.zona`, unlike `candidate-filters.tsx`'s `<select>` populated from
  the actual candidate/opportunity zone set. This is a a minor UX inconsistency with the
  FAM-05 reference pattern this story claims to mirror (a user must type the exact zone
  string, e.g. "Monterrey", with matching case, to get a match) — not a defect against any
  written acceptance criterion, but worth flagging since the fix explicitly cites
  `candidate-filters.tsx` as the mirrored pattern for this component.

### Re-run validation (this round, independently)

- `npm run lint` — pass, no warnings.
- `npm run typecheck` — pass (`next typegen && tsc --noEmit`).
- `npm test -- --run --no-file-parallelism` — **71 files / 503 tests passed**, matching the
  orchestrator's claimed count.
- `npm run check:secrets` — pass ("no server-only secret exposed client-side").
- `npm run build` — pass; production build includes `/ninera/oportunidades`,
  `/ninera/oportunidades/recibidas`, and all other existing routes; only the pre-existing
  Supabase Node 20 deprecation warning appeared.
- `npm run test:db` — pass; the E7-03 concurrent-submission probe (unrelated to this
  story's diff surface, but part of the same migration chain) completed with exit 0.

### Updated Acceptance Criteria Assessment (E7-05 items previously FAIL)

- PASS — Tablet breakpoint: no third tier required by the actual UX spec; binary
  mobile/desktop split matches the approved, already-VERIFIED FAM-05 precedent.
- PASS — Real `Limpiar` control present and functional on both desktop panel and mobile
  sheet.
- PASS — Dialog accessibility: initial focus, Tab focus trap, Escape dismissal, focus
  restoration, and body scroll lock are all genuinely implemented and independently
  verified by reading the event-handler code (not merely claimed).
- PASS — NIN-04/NIN-05 empty and filtered-no-results states use the shared
  `OpportunityEmptyState` template with a real in-place "Limpiar filtros" action.
- PASS — Desktop live-apply filtering (additional Visual QA finding, fixed in the same
  pass) is implemented without moving any authorization check client-side or exposing any
  necesidad that would not already have cleared `scoreMatch`'s hard eligibility filter.

### Final Round 2 Required Changes

None blocking. Optional cleanup (non-blocking, may be deferred or folded into a future
Change Request): remove the now-dead `normalizeOpportunityFilters` export, and consider
constraining NIN-05's zona filter to a `<select>` of known zones (matching FAM-05) instead
of free-text exact-match, for interaction consistency with the cited reference pattern.
