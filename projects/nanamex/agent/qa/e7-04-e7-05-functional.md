# Functional QA

## Verdict

**PASS** — final functional QA for E7-04/E7-05. No functional blocker found. Visual-spec deviations remain documented separately in `agent/qa/e7-04-e7-05-visual.md`; E7-06 behavior is intentionally deferred.

## Environment

- Repository: `projects/nanamex`; test date: 2026-09-05.
- Next.js 16.3.4, React 19.2.8, TypeScript, Vitest 4.1.11, local Supabase/Postgres.
- Web-only V1; native mobile QA is not applicable per `config/CONSTRAINTS.md`.
- QA did not modify production source. Browser automation/authenticated click-through was unavailable; evidence combines focused tests, full regression, source inspection, route/build output, and live database reset/probes.

## Test Cases

### TC-001 — Dashboard happy path and verification lifecycle
- **Scenario:** Exercise NIN-03 with complete/incomplete profiles, no opportunities, populated pushed opportunities, and `no_verificada`, `en_proceso`, and `verificada` states.
- **Expected:** Dashboard renders completion percentage/CTA, truthful recent-opportunity preview (maximum three), navigation to NIN-04/NIN-05, and honest verification banner; pending copy states 24–48 hours without making verification a completion gate.
- **Actual:** Focused dashboard tests pass. The dashboard computes six completion categories, renders the state-specific TrustBadge/banner, limits preview to three, sorts it, and exposes `/ninera/oportunidades/recibidas` and `/ninera/oportunidades`. Pending copy is “Normalmente toma 24–48 horas”; upload remains optional.
- **Result:** PASS

### TC-002 — NIN-04 provenance, lifecycle, and ordering
- **Scenario:** Inspect received-opportunity query and mapper against pushed/non-pushed, `nueva`/advanced, active/closed-parent, and legacy pipeline rows.
- **Expected:** Only authenticated niñera-owned rows with `source = pushed`, `estado = nueva`, and an active parent need appear; order is score descending, need recency descending, then pipeline ID ascending.
- **Actual:** Both query predicates and defensive mapper enforce source/lifecycle/parent state. `sortOpportunities` applies the required deterministic order. The provenance migration defines `pushed`, `family_view`, `family_favorite`, and explicit legacy `unknown`; unknown rows are excluded rather than guessed as pushed. Live `npm run test:db` reset applied the migration cleanly and all existing pipeline probes passed.
- **Result:** PASS

### TC-003 — NIN-05 matching and filters
- **Scenario:** Exercise matching conversion and supported query filters for zone, modality, salary overlap, day, and time; include malformed values, reversed salary ranges, and modality mismatch.
- **Expected:** Reuse the rules scorer; modality mismatch is excluded; valid filters narrow results; malformed values are ignored safely and do not broaden access to closed/future needs.
- **Actual:** Focused opportunity tests pass: scorer returns null for modality mismatch, valid matches score correctly, availability window checks day/time containment, and filter normalization safely rejects invalid day/time/ranges. The route fetches only `necesidades.estado = activa` and defensively rechecks state before scoring/filtering. The GET filter form preserves supported query parameters.
- **Result:** PASS

### TC-004 — Authentication, role, account, and onboarding authorization
- **Scenario:** Request dashboard, received-opportunity, and explore routes unauthenticated, as unauthorized/inactive/non-niñera accounts, and with incomplete onboarding.
- **Expected:** Redirect before service-role opportunity/profile reads; incomplete niñeras go to `/ninera/perfil`.
- **Actual:** Each route performs `auth.getUser()`, then `getNineraOnboardingState`, role/account checks, and onboarding redirect before service-role reads. Existing focused dashboard authorization tests pass; source inspection confirms the same ordering on both opportunity routes.
- **Result:** PASS

### TC-005 — Routes, navigation, placeholders, and recovery
- **Scenario:** Verify dashboard links, mobile/desktop niñera navigation destinations, Solicitudes/Cuenta placeholders, empty-state recovery, and built route inventory.
- **Expected:** All links resolve to existing routes; unsupported surfaces are clearly placeholders; empty states provide truthful recovery rather than dead or fake functionality.
- **Actual:** Production build includes `/ninera`, `/ninera/oportunidades`, `/ninera/oportunidades/recibidas`, `/ninera/solicitudes`, and `/ninera/cuenta`. Navigation exposes valid destinations; placeholders return to Inicio. NIN-04 empty state links to NIN-05; dashboard empty/populated states link to Explore/Received. No fake listing or mutation is presented.
- **Result:** PASS

### TC-006 — No-paywall niñera experience and E7-06 boundary
- **Scenario:** Inspect NIN-04/NIN-05 cards and action controls.
- **Expected:** No lock, checkout, entitlement, or paywall UI; E7-06-owned detail/interest/discard behavior is not simulated.
- **Actual:** Cards show anonymized family zone, modality, salary/date, score, checklist, and disabled “Ver detalle”, “Mostrar interés (próximamente)”, and pushed “Descartar” controls. No payment/contact-gate code or contact data is rendered. This matches the recorded E7-06 deferral and avoids fake writes/routes.
- **Result:** PASS

### TC-007 — Failure/state handling
- **Scenario:** Inspect loading, error, empty, and missing-data behavior for dashboard and opportunity routes.
- **Expected:** Loading feedback is present, read failures fail closed with retry, and empty results are distinct from errors.
- **Actual:** Dashboard and opportunity loading boundaries include navigation and skeleton content; error boundaries provide retry actions. Dashboard throws on query errors or missing required rows. NIN-04/NIN-05 use distinct empty branches with recovery links. The approved visual review separately records that some empty/loading composition is lighter than the UI spec; no data-integrity or failure-handling defect was found.
- **Result:** PASS

## Bugs

None found in final functional behavior.

The visual QA report retains presentation findings (responsive filter composition and empty-state hierarchy); those are not reclassified as functional bugs here. E7-06 detail/interest/discard actions are an accepted scope boundary, not a defect.

## Regression Results

- `npm test -- --run --no-file-parallelism`: **PASS — 69 files, 490 tests**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**.
- `npm run check:secrets`: **PASS**.
- `npm run build`: **PASS**; all target niñera routes present. Only existing Supabase Node 20 deprecation warnings appeared.
- `npm run test:db`: **PASS**; local reset applied pipeline provenance migration and all E0–E7-03 live probes completed successfully.

## Recommendation

Accept E7-04 and E7-05 functional behavior as passing. Mark the stories VERIFIED only after the orchestrator incorporates the independent visual QA verdict and resolves/accepts its presentation findings. Keep E7-06 deferred explicitly; its detail and interest mutation require a separate QA cycle when implemented. Browser-level authenticated verification remains desirable when tooling is available.
