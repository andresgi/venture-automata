# Implementation Plan — Clin (Nanamex)

Epics and dependency-aware stories for BUILD. Every story lists ID, objective,
dependencies, relevant PRD/addendum requirements, acceptance criteria, and validation
expectations. Validation expectations always include, at minimum, the standard bar from
AGENTS.md Implementation Rules (lint, typecheck, tests, `next build`) — only
story-specific additions are called out per story.

Ordering across epics is dependency-driven, not strictly sequential — stories within
different epics can run in parallel once their own dependencies clear (e.g. E7 niñera
profile work can start alongside E2 familia necesidad work; both feed E3 matching).

---

## Epic 0 — Foundations

### E0-01 — Repository, tooling, and CI scaffold

Objective: Initialize the Next.js/TypeScript project per `engineering/architecture.md` §2
repo layout; configure lint/typecheck/test/build scripts and CI to run them on every PR.

Dependencies: none.
PRD/addendum requirements: `config/CONSTRAINTS.md` stack mandate.
Acceptance criteria:
- Next.js App Router project builds cleanly with TypeScript strict mode.
- `app/`, `actions/`, `lib/`, `db/`, `emails/`, `components/`, `tests/` directories exist
  per `architecture.md` §2.
- CI runs lint, typecheck, test, `next build` on every PR; fails the PR if any fail.
Validation: CI green on an intentionally trivial PR (e.g. README stub) before any feature
work merges.

### E0-02 — Supabase project setup (dev + preview + prod), migrations pipeline

Objective: Provision Supabase projects per environment (`architecture.md` §13), set up
SQL migration tooling.
Dependencies: E0-01.
Acceptance criteria:
- Separate Supabase projects for dev/preview/prod exist; prod and preview never share a DB.
- `db/migrations` applies cleanly to a fresh Supabase instance via CLI in CI.
- Service-role key stored only as a server-side env var, never `NEXT_PUBLIC_*`.
Validation: fresh migration run against a clean project succeeds; secret-scanning check
(e.g. CI step or pre-commit hook) confirms no key is exposed client-side.

### E0-03 — Core schema migration: `profiles`, `perfil_familiar`, `perfil_ninera`, `zonas`

Objective: Implement `database.md` §1–4 as SQL migrations, including the `rango_edad` and
other enums.
Dependencies: E0-02.
Acceptance criteria: matches `database.md` field-for-field; `zonas` seed script populates
the launch city's alcaldías/colonias with centroid coordinates.
Validation: migration + seed run in CI against a throwaway DB; a query confirms seed row
count > 0.

### E0-04 — Auth wiring: Supabase Auth + role-based middleware

Objective: Implement registration (email/password), Supabase's email confirmation flow,
role assignment at registration, and Next.js middleware enforcing `/familia/*`,
`/ninera/*`, `/admin/*` route-group access by `profiles.role`.
Dependencies: E0-03.
PRD/addendum requirements: PRD §5 "Registro/login" (both sides); `AUTH-02`/`AUTH-04`;
`architecture.md` §6.
Acceptance criteria:
- A familia account cannot load any `/ninera/*` or `/admin/*` route (server-side redirect
  with the neutral banner per `UX-spec.md` Part C / `UI-SPEC.md` "Acceso no autorizado").
- Duplicate email/phone registration is rejected with the specified inline error +
  "Iniciar sesión" link (`AUTH-02` spec).
- Role is immutable post-registration (no UI or API path to change it).
Validation: integration test covering registration → role-mismatched route → redirect +
banner; duplicate-registration test.

### E0-05 — Twilio Verify integration (phone OTP)

Objective: Implement phone OTP send/confirm via Twilio Verify; wire to `AUTH-03`'s
teléfono checklist row.
Dependencies: E0-04.
PRD/addendum requirements: PRD §5 "Verificación de teléfono"; `AUTH-03`.
Acceptance criteria: OTP send has resend cooldown (per UX spec, e.g. 60s); invalid/expired
code shows inline error without losing correo verification state; success sets
`profiles.phone_verified = true`.
Validation: mock Twilio in tests (no real SMS sent in CI); manual smoke test against
Twilio's test credentials before first prod use.

### E0-06 — Vercel deployment pipeline (preview + production)

Objective: Connect the repo to Vercel; configure environment variables per environment;
confirm preview deployments work per-PR.
Dependencies: E0-01, E0-02.
Acceptance criteria: every PR gets a working preview URL against the preview Supabase
project; production deploy is a manual promotion, never automatic on merge to `main`.
Validation: a test PR produces a working preview deployment.

---

## Epic 1 — Familia Onboarding

### E1-01 — AUTH-01 Landing + role selection

Dependencies: E0-04. PRD: PRD §4 flow entry.
Acceptance criteria: matches `UI-SPEC.md` AUTH-01 layout (adults-only hero image per
`UI-SYSTEM.md` §0.10 — enforce via an explicit content-review checklist item, not
technically enforceable in code); role selection routes into `AUTH-02` with the role
pre-filled.
Validation: Visual QA against `UI-SPEC.md` AUTH-01; confirm no child imagery present.

### E1-02 — AUTH-02/03 registration + verification (familia)

Dependencies: E0-04, E0-05.
Acceptance criteria: soft-gate behavior exactly as resolved in `journeys.md` J-FAM-1
(post-fix) — a family may proceed to `FAM-01`/necesidad creation before completing both
verifications; both are required before `Contactar` succeeds (enforced server-side in
E5's entitlement check, not just UI-hidden).
Validation: integration test: unverified family can create+publish a necesidad; the same
family is blocked server-side (not just UI-blocked) from a `Contactar` action until both
channels verify.

### E1-03 — FAM-01 onboarding perfil familiar

Dependencies: E1-02, E0-03 (`zonas` seeded).
Acceptance criteria: nombre + zona (autocomplete against `zonas`) required to proceed.
Validation: standard form validation tests.

---

## Epic 2 — Necesidad Creation (Familia)

### E2-01 — FAM-03 wizard: steps 1–7 + draft autosave

Dependencies: E1-03.
PRD/addendum requirements: PRD §5 (six necesidad fields + responsabilidades); PRD §9/
`config/CONSTRAINTS.md` age-range enforcement; `database.md` §5a.
Acceptance criteria:
- Step 1 (Niños) renders only the fixed `rango_edad` chip set — **no numeric/date input
  exists in the DOM at any point**, client or server.
- Draft auto-saves per step transition (resumable from `FAM-02`).
- Server-side validation re-checks every client-validated field (pago_min ≤ pago_max,
  fecha_inicio not in the past, at least one child age range, etc.) — a request that
  bypasses the client (e.g. direct API call) cannot persist invalid data.
Validation: unit tests on the server action's zod schema, specifically including a test
that attempts to submit a numeric/exact-age value for a child and confirms it is rejected
by the schema (defense against a future accidental UI regression reintroducing exact ages).

### E2-02 — FAM-03 Revisión + Publicar (triggers initial match computation)

Dependencies: E2-01, Epic 3 (matching engine) available as a callable function.
Acceptance criteria: publish transitions `estado: borrador → activa`, calls
`computeMatches`, redirects to `FAM-04` (populated or empty state per spec).
Validation: integration test — publish with zero eligible niñeras in seed data reaches
`FAM-04` in the documented empty state, not an error.

### E2-03 — FAM-02 dashboard (Mis necesidades)

Dependencies: E2-02.
Acceptance criteria: matches `UI-SPEC.md` FAM-02 (card grid, pipeline summary counts,
empty/loading states).

### E2-04 — Necesidad editing after publish, incl. matching-relevant-field re-match

Dependencies: E2-02, Epic 3.
PRD/addendum requirements: `architecture.md` §17 (resolves UX-spec.md Part E item 6).
Acceptance criteria:
- Editing a matching-relevant field re-runs `computeMatches` and updates `FAM-04`/`Nueva`
  pipeline rows' live view.
- Editing does **not** alter `match_score_snapshot`/`match_checklist_snapshot` on any
  pipeline row already past `nueva` (Contactada/Entrevista/Contratada/Descartada).
Validation: integration test — contact a candidate, then edit the necesidad's modalidad to
one the contacted candidate doesn't offer; assert the existing pipeline record and its
snapshot are unchanged, and the candidate no longer appears in a fresh `FAM-04` query.

---

## Epic 3 — Matching Engine

### E3-01 — Hard filter + weighted scoring implementation

Dependencies: E0-03 (schema), E2-01/E7-0x (both sides' data model available — can be
stubbed with seed data for parallel development).
PRD/addendum requirements: PRD §6; `architecture.md` §15 (full rule table).
Acceptance criteria: implements exactly the hard filter and five weighted factors, weights,
and `MATCH_COMPATIBLE_THRESHOLD = 60` from `architecture.md` §15 as named, tunable
constants (not inline magic numbers).
Validation: **unit test suite covering every factor pass/fail combination** (at minimum:
all-pass=100%, each single factor failing in isolation, modalidad-mismatch excluded
entirely from results) — this is the single most product-critical piece of business logic
in the system and must have direct test coverage, not just integration-level smoke tests.

### E3-02 — Ranking + tie-break, `computeMatches` service

Dependencies: E3-01.
Acceptance criteria: sort order exactly matches `architecture.md` §15.4; verification
status is provably not read anywhere in the ranking/tie-break code path (a code-review
checklist item, not just a test — the absence of a signal is hard to unit-test directly,
so this is called out for Code Reviewer's explicit attention).
Validation: unit test with two niñeras of equal score/completeness/created_at but
different `verification_status`, asserting stable order unaffected by that field.

---

## Epic 4 — Candidate Browsing & Profile (Familia)

### E4-01 — FAM-04 listado de candidatas (default/empty/loading/error states)

Dependencies: E3-02.
Acceptance criteria: all four states per `UI-SPEC.md` FAM-04; Match Score numeral + up to
3 checklist lines per card; `TrustBadge` present in all three states without layout shift.
Validation: Visual QA against `UI-SPEC.md`; Functional QA against each of the four states
(seed data engineered to produce each).

### E4-02 — FAM-05 filtros

Dependencies: E4-01. Acceptance criteria: bottom sheet (mobile) / sidebar (desktop) per
spec; filters apply without page reload.

### E4-03 — FAM-06 perfil de niñera detail + pipeline record auto-creation

Dependencies: E4-01.
PRD/addendum requirements: `information-architecture.md` Pipeline object resolution
(pipeline row created on first favorite or first full-profile view, state=`nueva`).
Acceptance criteria: opening `FAM-06` creates a `pipeline` row (if absent) with a frozen
`match_score_snapshot` at that instant; fires `candidate_profile_viewed` always, and
`compatible_match_found` only if score ≥ 60 and this is the first such view for the pair
(per `analytics.md` §2).
Validation: integration test asserting `compatible_match_found` fires exactly once across
repeated views of the same pair; test asserting it does not fire for a sub-60 score.

### E4-04 — FAM-07 favoritas

Dependencies: E4-03.

---

## Epic 5 — Paywall, Payments, Entitlements

### E5-01 — Stripe integration: Checkout Session creation

Dependencies: E1-02 (verification gate available to check).
PRD/addendum requirements: PRD §7; `architecture.md` §16.
Acceptance criteria: `Contactar`/`Solicitar entrevista` checks (a) both contact channels
verified, (b) active `entitlements` row; if neither blocks, and no active entitlement,
routes to `FAM-08`→`FAM-09`, creating a Stripe Checkout Session for MX$299.
Validation: test asserting an unverified family is blocked server-side even if it
somehow reaches the checkout route directly (defense-in-depth, not just UI gating).

### E5-02 — Stripe webhook handler: entitlement activation

Dependencies: E5-01.
Acceptance criteria: webhook signature verified (rejects unsigned/invalid payloads);
idempotent on `provider_payment_id` (a redelivered webhook does not create a second
entitlement or extend expiry twice); stacks `expires_at` correctly on repurchase per
`architecture.md` §16.1.
Validation: unit test simulating a duplicate webhook delivery; unit test simulating
repurchase before expiry, asserting `expires_at` extends from the *current* expiry, not
from `now()`.

### E5-03 — FAM-08/09 paywall + checkout screens

Dependencies: E5-01. Acceptance criteria: matches `UI-SPEC.md` FAM-08/09 exactly,
including the generic (not-yet-finalized) offer copy note; non-dismissible during payment
processing.

### E5-04 — FAM-10 solicitar entrevista (post-unlock contact action)

Dependencies: E5-02.
Acceptance criteria: creates the `contacto` row, advances `pipeline.estado` to
`contactada`, fires `candidate_contacted` analytics event, notifies the niñera
(Epic 10).
Validation: integration test — full flow from unlock through contact confirmation,
asserting the pipeline state, the analytics event, and the notification are all produced
by a single successful action (no partial-success state where payment succeeds but no
contact record exists, or vice versa).

### E5-05 — FAM-13 cuenta: entitlement/payment history

Dependencies: E5-02.

---

## Epic 6 — Pipeline Management

### E6-01 — FAM-11 estado de candidatas (kanban/segmented views)

Dependencies: E5-04.
Acceptance criteria: manual `Avanzar estado` transitions available from `contactada`
onward only (never a manual `nueva → contactada` control, per `UX-spec.md` FAM-11);
`Descartar` available from any state.
Validation: test asserting no server action exists/succeeds for a manual
`nueva → contactada` transition — it must only ever occur via E5-04's paid flow.

### E6-02 — NIN-09 mis solicitudes (read-only mirror)

Dependencies: E6-01. Acceptance criteria: read-only, no state-changing controls rendered
or accepted server-side for the niñera role on pipeline rows.

---

## Epic 7 — Niñera Profile & Discovery

### E7-01 — NIN-01/02 onboarding wizard

Dependencies: E0-04.
PRD/addendum requirements: PRD §5 (niñera profile fields); `config/CONSTRAINTS.md` age
ranges (via `ninera_experiencia_edades`, same enum as necesidad children).
Acceptance criteria: `perfil_completo` computed correctly once all required fields set;
profile is `publicado` (discoverable) only once complete, regardless of
`verification_status` (addendum's interim-visibility rule — a `no_verificada` profile is
still `publicado` and appears in matching/browsing).
Validation: test confirming a `no_verificada`, `perfil_completo=true` niñera appears in
`computeMatches` results — this is the direct, testable expression of the addendum's
Critical Issue #2 resolution and should be treated as a regression-critical test.

### E7-02 — NIN-07 mi perfil (edit) + badge-integrity re-review trigger

Dependencies: E7-01.
PRD/addendum requirements: `architecture.md` §18 (resolves UX-spec.md Part E item 7).
Acceptance criteria: editing `nombre` or `foto_url` when `verification_status =
verificada` sets it to `en_proceso`, creates a new `identity_verifications` row with
`motivo = re-revision_por_edicion_de_perfil` reusing the existing document path; editing
any other field never changes `verification_status`.
Validation: unit test for both branches (identity-relevant vs. not) explicitly.

### E7-03 — NIN-08 subir identificación

Dependencies: E7-01. PRD: PRD §5 "Verificación de identidad."
Acceptance criteria: upload sets `status = pendiente`, profile remains `publicado`
throughout; SLA copy ("normalmente 24–48 horas") rendered, not a hard promise; file
type/size validated server-side (not just client-side).
Validation: test uploading an invalid file type is rejected server-side even if the
client-side check is bypassed.

### E7-04 — NIN-03 dashboard (banner-scale badge, % completo)

Dependencies: E7-01, E7-03.

### E7-05 — NIN-04 oportunidades recibidas (pushed) + NIN-05 explorar vacantes

Dependencies: E3-02.
PRD/addendum requirements: `journeys.md` J-NIN-3/J-NIN-4 (Decision 1 hybrid model).
Acceptance criteria: `NIN-05` excludes necesidades in `cerrada_*` state; niñera-side
Match Score checklist uses the niñera-facing factor labels per spec; no paywall affordance
anywhere on either screen.
NIN-04 additionally reads only `pipeline.source = 'pushed'`, `pipeline.estado = 'nueva'`,
and related `necesidades.estado = 'activa'`. Ordering is score descending, then
`necesidades.updated_at` descending (stable recency), then `pipeline.id` ascending.
Validation: Functional QA confirms zero lock/paywall UI elements on `NIN-04`/`NIN-05` per
`UI-SPEC.md`'s cross-cutting checklist item 3 (family-side rule, verify it's also true on
the mirrored niñera-side screens even though not explicitly re-stated there).

### E7-06 — NIN-06 detalle de vacante + Mostrar interés

Dependencies: E7-05. Acceptance criteria: `interes_ninera` flag set on the pipeline row
(auto-created if absent) without changing `estado`; family sees the "interesada" flag on
`FAM-04` (informational chip, per `UI-SPEC.md` §5.5), which does not require an active
entitlement to display (it's free/informational, not a paid reveal).

---

## Epic 8 — Identity Verification (Admin)

### E8-01 — ADM-01 admin login (no self-registration path exists)

Dependencies: E0-04. Acceptance criteria: no route/API exists that can create an admin
account other than direct DB provisioning (verify by attempting to reach an admin-role
registration flow via any exposed route — must 404/redirect).

### E8-02 — ADM-02 cola de verificación (FIFO + SLA color coding)

Dependencies: E8-01, E7-03.
PRD/addendum requirements: 24–48h SLA target, addendum Critical Issue #2.
Acceptance criteria: SLA bucket computed at read time (`now() - submitted_at`), not via a
stored/cron-updated field; red rows sort to top regardless of raw FIFO order.
Validation: seed data with submissions at <24h/24-48h/>48h ages; assert correct bucket and
sort order.

### E8-03 — ADM-03 detalle de verificación: approve/reject + signed URL access

Dependencies: E8-02.
PRD/addendum requirements: `security.md` §7 (access logging).
Acceptance criteria: reject requires a reason code (server-enforced, not just client
-required); approve/reject writes `decided_by`, `decided_at`; every signed-URL generation
for the document image writes an `identity_document_access_log` row; corrupt/unloadable
image path allows a reject with the "no se pudo abrir el documento" reason without
stalling the queue.
Validation: test asserting a reject request without a reason code is rejected by the
server action (not just disabled in the UI); test asserting an access-log row is created
per document view.

### E8-04 — Verification decision → `perfil_ninera.verification_status` sync + niñera notification

Dependencies: E8-03. Acceptance criteria: status update and niñera notification
(Epic 10) happen transactionally with the decision — no state where a decision is recorded
but the niñera's visible badge hasn't updated.

**Note — Admin MFA (deferred, not gate-blocking):** `security.md` §1 recommends enabling
Supabase Auth MFA for admin accounts before production ID-document review. No story in
this epic implements it — admin accounts are few and manually provisioned, so this is
tracked as a pre-RELEASE_GATE checklist item (`security.md` §10, item 3), not a BUILD
dependency for E8.

---

## Epic 9 — Reports (Admin)

### E9-01 — FAM-12/NIN-10 reportar

Dependencies: E4-03 (familia side), E7-06 (niñera side).
Acceptance criteria: no visible change to the reported profile on submission (Decision 5);
confirmation copy matches `UX-spec.md`'s expectation-setting language exactly.

### E9-02 — ADM-04 cola de reportes (grouped by repeat-report volume)

Dependencies: E9-01. Acceptance criteria: `estado = en_revision` never queryable/visible
by a non-admin role (test this at the API/RLS layer, not just "the UI doesn't show it").

### E9-03 — ADM-05 resolución + Eliminar cuenta confirmation

Dependencies: E9-02.
Acceptance criteria: `suspender`/`eliminar` update `profiles.account_status`
transactionally with the resolution; `eliminar cuenta` requires the explicit confirm-dialog
step (`destructive-solid` button, per `UI-SPEC.md`) and anonymizes rather than
hard-deletes (`security.md` §6).
Validation: test confirming a `descartado`/`advertido` resolution never changes
`account_status`; test confirming `eliminado` anonymizes rather than removes rows that
other tables FK into (pipeline/reportes integrity preserved).

---

## Epic 10 — Notifications

### E10-01 — Resend email templates + send infrastructure

Dependencies: E0-04.
Acceptance criteria: templates for email verification, pipeline-state change,
contact-request received (niñera), verification decision (niñera), password reset
(delegated to Supabase's own template, styled to match brand where Supabase allows).

### E10-02 — Twilio SMS notifications (pipeline state change, verification decision)

Dependencies: E10-01, E0-05.
Acceptance criteria: SMS delivery failure is non-blocking (per `FAM-10`'s spec — the
request itself still records; retried delivery in background, not blocking the primary
action's success response).
Validation: test that a simulated Twilio send failure does not roll back or fail the
triggering action (e.g. `candidate_contacted` still succeeds even if the SMS send throws).

---

## Epic 11 — Analytics Instrumentation

### E11-01 — PostHog SDK integration (server + client) + `analytics_events` table writer

Dependencies: E0-04.
Ownership note: E4-03 creates the durable `analytics_events` table and writes its FAM-06
events. E11-01 consumes and extends this schema (no replacement migration), adding PostHog
delivery without duplicating domain events or dropping durable records.

Acceptance criteria: every event in `analytics.md` §2 fires from the correct server action
with the specified properties; events also write to `analytics_events` for the
North-Star/SLA computations that must not depend on a third-party vendor being reachable.

### E11-02 — North Star + diagnostic-metric dashboard (internal)

Dependencies: E11-01, E4-03, E5-04.
PRD/addendum requirements: the addendum's core funnel-split requirement.
Acceptance criteria: a query/report (internal admin page or a scheduled export — build
decision left to whoever implements, not prescribed here) surfaces both the North Star and
the "found match, no contact" diagnostic metric together, never the North Star alone.
Validation: seeded-data test producing a known ratio for both metrics, asserting the
computed values match.

### E11-03 — Verification turnaround / SLA operational dashboard

Dependencies: E11-01, E8-04.
Acceptance criteria: median/p90 turnaround + queue-age bucket counts computed correctly
against seed data spanning all three SLA buckets.

---

## Epic 12 — Retention Job (Identity Documents)

### E12-01 — `purge-identity-documents` cron endpoint (policy-gated, no-op by default)

Dependencies: E8-03, E0-06 (Vercel Cron configured).
PRD/addendum requirements: `security.md` §8 (explicitly unresolved retention period).
Acceptance criteria: with `IDENTITY_DOC_RETENTION_DAYS` unset, the job runs, deletes
nothing, and logs a warning; with it set (test environment only), the job deletes storage
objects and clears `document_storage_path` for rows past the threshold while preserving
the `identity_verifications` row itself.
Validation: test both branches explicitly. **This story must not set a default value for
`IDENTITY_DOC_RETENTION_DAYS` in any environment other than test** — production/preview
leave it unset until the human/legal decision in `security.md` §8 is made.

---

## Epic 13 — Cross-Cutting States & Polish

### E13-01 — SYS-01/02/03 + permission-denied banner

Dependencies: E0-04. Acceptance criteria: session-expiry (`SYS-02`) preserves and returns
to the pre-expiry destination (explicitly tested against a mid-`FAM-09`-checkout scenario,
called out in `UX-spec.md` as the critical case not to regress).

### E13-02 — Responsive QA pass (all breakpoints per `UI-SYSTEM.md` §2)

Dependencies: all FAM-0x/NIN-0x screen stories complete.
Acceptance criteria: 3-column desktop grid breakpoint at ≥1280px (per the UI phase's
reconciled value, `agent/DECISIONS.md` 2026-09-01) verified on `FAM-04`/`NIN-04`/`NIN-05`.

### E13-03 — Admin desktop-only scope confirmation

Dependencies: E8-02, E9-02. Acceptance criteria: no mobile-specific admin layout is built
(matches `config/CONSTRAINTS.md` QA Ownership — mobile QA not applicable); confirm admin
routes render usably at common desktop widths only, per scope.

---

## Dependency Summary (critical path)

```
E0 (foundations) 
  → E1 (familia auth/onboarding) ─┬→ E2 (necesidad) ─┐
  → E7-01..03 (niñera profile) ───┘                  ├→ E3 (matching) → E4 (browse/profile)
                                                       │                      │
  E8 (identity verification, parallel to E2–E4) ──────┘                      ↓
                                                                    E5 (paywall/payments) → E6 (pipeline)
  E9 (reports, parallel, depends only on E4-03/E7-06)                        │
  E10 (notifications, feeds E5-04/E8-04/E6)  ───────────────────────────────┘
  E11 (analytics, instruments E4-03/E5-04/E8-04 as they land)
  E12 (retention job, depends on E8-03 existing)
  E13 (cross-cutting polish, last)
```

E3 (matching engine) is the true architectural chokepoint — E2/E4/E7 can all develop in
parallel against it once its interface (`computeMatches(necesidadId)`) is stubbed, but no
end-to-end flow is demonstrable until E3-01/02 are real. Recommend building E3 early and
in parallel with E1/E0, not after E2/E7 are "done."
