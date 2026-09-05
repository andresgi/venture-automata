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
