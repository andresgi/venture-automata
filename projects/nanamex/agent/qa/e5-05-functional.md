# Functional QA

## Verdict

PASS

## Environment

- Repository: `projects/nanamex`; web-only Next.js 16.3.4 / TypeScript / React 19 / Vitest 4.1.11.
- QA ownership: web QA is agent-driven; native mobile QA is not applicable per `config/CONSTRAINTS.md`.
- Test date: 2026-09-04.
- Independent review covered the E5-05 account page, shared family onboarding guard, FAM-01 route, all requested direct family routes, navigation, existing E5 payment behavior, tests, source, and current production build. No production code was modified by QA.
- No authenticated live-browser fixture is available. DOM behavior was verified with RTL/Vitest and server-route behavior with direct component execution/source tracing. This is acceptable for the web QA setup, but does not replace a human browser smoke test for pixel/real-network behavior.

## Test Cases

### TC-001 — Cuenta authenticated family happy path and account data
- **Scenario:** Render `/familia/cuenta` for an authenticated active family with contact status, no entitlement, and no payments.
- **Expected:** Account page renders contact verification, entitlement state, empty payment history, security placeholder, and return navigation.
- **Actual:** `Cuenta`, `Correo`/`Teléfono` rows, `Sin desbloqueo activo`, `Aún no tienes pagos.`, security placeholder, and `Volver` render. Focused test passes.
- **Result:** PASS

### TC-002 — Cuenta authentication, role, active account, and onboarding authorization
- **Scenario:** Exercise no session, non-family/inactive-family rejection, and an active family without `perfil_familiar`.
- **Expected:** No session redirects to `/login`; non-family/inactive family redirects to `/familia`; incomplete family redirects to `/familia/perfil`; account entitlement/payment reads do not occur after rejection.
- **Actual:** Account page authenticates with `auth.getUser`, invokes the shared server-side state helper before account reads, rejects non-family accounts, and redirects incomplete families. Focused tests confirmed the incomplete route performs zero account reads. Source tracing confirms the helper requires role `familia` and `account_status = activa`.
- **Result:** PASS

### TC-003 — FAM-01 direct route and no redirect loop
- **Scenario:** Open `/familia/perfil` before onboarding and after a profile row exists.
- **Expected:** Pre-onboarding route remains reachable and renders the required name/zone form; after completion it remains a revisitable edit route and does not loop back to itself.
- **Actual:** FAM-01 tests pass for unauthenticated redirect, prefilled name, empty zone, and existing zone. `FamiliaLayout` renders children while suppressing persistent navigation when incomplete; it does not redirect `/familia/perfil`. After onboarding, layout restores navigation.
- **Result:** PASS

### TC-004 — Direct URL guards before FAM-01 completion
- **Scenario:** Directly invoke `/familia/favoritas`, `/familia/necesidad`, `/familia/necesidad/[id]`, and `/familia/necesidad/[id]/candidatas/[ninId]` for an authenticated family with no `perfil_familiar` row.
- **Expected:** Every destination redirects to `/familia/perfil` before destination reads (and the wizard does not load zones or draft data).
- **Actual:** Focused tests pass: Favoritas and Cuenta redirect before data access; the new-necesidad route redirects before `listZonas`, profile, or draft queries; necesidad-list and candidate-detail routes redirect before necesidad/candidate reads. The source order is consistently auth -> shared onboarding state -> destination reads.
- **Result:** PASS

### TC-005 — Direct URL behavior after FAM-01 completion
- **Scenario:** Invoke the same Cuenta/Favoritas/necesidad/necesidad-id/candidate-detail routes for a completed active family.
- **Expected:** Guards permit access and each route proceeds to its own authorized data path; invalid/missing destination objects do not expose data.
- **Actual:** Focused suites pass for completed-family rendering, empty/error/list/detail paths, and candidate unavailable behavior. Destination queries remain session-scoped: necesidad routes apply `familia_id = user.id`; candidate detail also checks active necesidad, published/complete/active candidate, and account role. Favoritas reads necesidades constrained to the session family. Account reads use the authenticated ID.
- **Result:** PASS

### TC-006 — Navigation and active route state
- **Scenario:** Inspect family navigation before and after onboarding and navigate from dashboard/account shell.
- **Expected:** Incomplete onboarding exposes no persistent family destinations; completed users receive `Mis necesidades`, `Favoritas`, and `Cuenta`; nested Cuenta paths mark Cuenta active; Cuenta and dashboard links use approved URLs.
- **Actual:** Layout/navigation tests pass. Navigation emits the three links in desktop and mobile variants, marks `/familia/cuenta` active including nested paths, and hides the shell during incomplete onboarding. Dashboard source/test provides `Cuenta` at `/familia/cuenta`.
- **Result:** PASS

### TC-007 — Entitlement states, boundaries, ordering, and payment history
- **Scenario:** Render no entitlement, active entitlement, expired entitlement, exact/under-one-day expiry, populated history, and supported/unknown payment statuses.
- **Expected:** Active status uses `expires_at > now`; expired status shows zero days; remaining days use ceiling/clamp; newest expiry/payment order is used; only approved payment fields render; empty and status labels are clear.
- **Actual:** Tests pass for `Sin desbloqueo activo`, `Activo`, `Expirado`, zero/one-day boundaries, Monterrey date formatting, empty history, active MX$299 display, and session-scoped query predicates. Source selects only `id, amount, status, created_at` for payments and maps known statuses with `No disponible` fallback.
- **Result:** PASS

### TC-008 — Loading, database failure, and retry behavior
- **Scenario:** Render account loading state and inject profile/entitlement/payment read failures.
- **Expected:** Account-shaped accessible loading UI appears; failures show a user-facing retry state without exposing account data or causing a full redirect.
- **Actual:** Loading test passes with `aria-busy="true"`, `Cargando tu cuenta`, and account skeleton sections. Account query failures render `No se pudo cargar tu cuenta` and `Reintentar`; retry calls `router.refresh()`. Unauthorized/incomplete cases are rejected before account-data failure paths.
- **Result:** PASS

### TC-009 — Authorization and data isolation
- **Scenario:** Attempt to access family surfaces as another role/account and inspect all account/destination query predicates.
- **Expected:** No cross-family reads or role mismatch access; no caller-supplied family identifier is trusted.
- **Actual:** Shared helper uses server-side session user ID; Account uses `entitlements.familia_id = user.id` and `payments.familia_id = user.id`; Favoritas and necesidad routes use the same session ownership constraints. Non-family tests pass for Favoritas and Cuenta; source checks confirm the candidate/detail role and ownership checks.
- **Result:** PASS

### TC-010 — No mutation scope / no E5-04 leakage
- **Scenario:** Inspect E5-05 account implementation and adjacent navigation/guard changes for write actions.
- **Expected:** E5-05 is read-only and must not create contacts, change pipeline state, write analytics/notifications, mutate payment/entitlement rows, or alter passwords.
- **Actual:** Account page has only server reads and presentation, with no server actions/forms/mutation calls. Payment and entitlement writes remain in the webhook/payment boundary code; security is explicitly a placeholder. Shared guard only reads authorization state. No E5-04 mutation wiring is present in E5-05 account code.
- **Result:** PASS

## Bugs

None found.

## Regression Results

- Focused E5-05/onboarding/direct-route suites: **PASS — 9 files, 46 tests**.
- Full Vitest suite: **PASS — 51 files, 349 tests**.
- `npm run lint`: **PASS**.
- `npm run typecheck`: **PASS**; route types generated successfully.
- `npm run check:secrets`: **PASS** — no server-only secret exposed client-side.
- `npm run build`: **PASS**; all requested family routes compile as dynamic server-rendered routes. Only the existing Supabase Node 20 deprecation warning was emitted.
- `npm run test:db`: **PASS** — local database reset and all existing necesidad/profile-view/favorites/payment-boundary/webhook probes completed successfully. The duplicate pending-payment constraint error printed during its concurrency scenario was expected evidence; the command exited successfully. E5-05 adds no migration.

## Recommendation

Accept the E5-05 functionality as passing. Do not mark the backlog item VERIFIED or merge; leave workflow status ownership to the orchestrator. A real authenticated browser smoke test remains advisable before release, but no functional blocker was found in this independent pass.
