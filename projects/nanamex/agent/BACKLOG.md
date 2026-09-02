# Project Backlog

## INIT — Project Initialization

### INIT-001 — Populate project configuration

Status: VERIFIED

Objective:

Derive or interview for enough information to populate config/PROJECT.md,
config/CONSTRAINTS.md, and config/WORKFLOW.md (see AGENTS.md, "Project Initialization").

Acceptance criteria:

- [x] config/PROJECT.md completed (venture name, mission, initial concept, target user,
      problem, known constraints)
- [x] config/CONSTRAINTS.md completed (technical, business, legal/data, non-goals, risk
      tolerance — or explicitly marked "none known" per section)
- [x] config/WORKFLOW.md has an explicit status for every phase in AGENTS.md's phase
      catalog (no phase left as the unpopulated `auto` default without deliberate intent)
- [x] agent/STATE.md updated: Current Phase set to the first applicable phase, Phase Status
      populated for every applicable phase
- [x] agent/BACKLOG.md updated with the first real backlog item(s) for that phase
- [x] Initialization recorded in agent/DECISIONS.md

## PRODUCT_STRATEGY — provided (PRD supplied by founder)

### PS-001 — Review-only critique of supplied PRD

Status: VERIFIED

Objective:

product/prd.md was supplied directly by the founder (not authored by the Product Manager
agent). Per AGENTS.md Fast-start, run Product Critic once in review-only mode against it —
findings are advisory, not a revision mandate. Do not modify the PRD itself.

Acceptance criteria:

- [x] Product Critic has reviewed product/prd.md for evidence quality, reasoning quality,
      unresolved risk, and MVP discipline (agent/qa/prd-review.md, verdict REVISE)
- [x] Findings, plus the PRD, presented to the human for PRODUCT_GATE
- [x] Orchestrator records in agent/DECISIONS.md whether the PRD is accepted as-is or a
      revision is requested before PRODUCT_GATE — accepted as-is with product/prd-addendum.md
      supplementing it (see agent/DECISIONS.md, 2026-08-31)
- [ ] Human's final PRODUCT_GATE approval recorded in agent/DECISIONS.md — pending, see
      PS-002

### PS-002 — PRODUCT_GATE human approval

Status: VERIFIED

Objective:

Obtain the human's explicit approval to proceed from PRODUCT_STRATEGY into BRAND/UX/UI/
TECH_ARCHITECTURE, per AGENTS.md's PRODUCT_GATE requirement. Basis for approval:
product/prd.md + product/prd-addendum.md (addendum resolves the two critical issues from
PS-001's review; six "Important" issues are explicitly deferred as spikes to their owning
downstream phase).

Acceptance criteria:

- [x] Human approval explicitly recorded in agent/DECISIONS.md ("Sí, apruebo PRODUCT_GATE,
      continúa", 2026-08-31)
- [x] agent/STATE.md advanced to UX phase

## UX

### UX-001 — Journeys, IA, screen inventory, UX spec

Status: VERIFIED (minor consistency fixes applied post-review, see UX-002 and
agent/DECISIONS.md 2026-08-31)

Objective:

Convert product/prd.md + product/prd-addendum.md into user journeys, information
architecture, screen inventory, and UX states for both sides of the marketplace (familia,
niñera), including the admin-side surfaces implied by the PRD (manual identity verification
review queue, report handling).

Acceptance criteria:

- [ ] design/journeys.md — end-to-end journeys for familia (registro → crear necesidad →
      ver candidatas → contactar/agendar → contratar) and niñera (registro → perfil →
      disponibilidad → recibir oportunidades → mostrar interés → entrevista), plus an admin
      journey for manual identity verification and report review
- [ ] design/information-architecture.md
- [ ] design/screen-inventory.md — covers every MVP surface in PRD section 5, plus states
      required by product/prd-addendum.md (pending-verification state, paywall/contact-gate
      state, reported-profile state)
- [ ] design/UX-spec.md — interaction behavior and UX states (loading/empty/error where
      relevant), explicitly resolving the deferred spikes that are UX's to own per
      product/prd-addendum.md: niñera self-serve browsing (yes/no + design if yes), how
      "Referencias" (verified vs. self-reported) is visually distinguished from the verified-
      identity badge, and the pending-verification visual state
- [ ] UX Critic has reviewed and returned PASS or PASS_WITH_MINOR_ISSUES (REVISE issues
      resolved, max 3 review cycles per AGENTS.md)

### UX-002 — Independent UX Critic review

Status: VERIFIED

Objective:

UX Critic independently reviews design/journeys.md, design/information-architecture.md,
design/screen-inventory.md, design/UX-spec.md against product/prd.md, product/prd-addendum.md,
and config/CONSTRAINTS.md — particularly whether the five UX decisions delegated by the
addendum were actually resolved and are internally consistent.

Acceptance criteria:

- [x] Review written to agent/qa/ux-review.md with a verdict — PASS_WITH_MINOR_ISSUES
- [x] Minor/Important issues fixed directly by UX Designer (narrow, mechanical corrections;
      see agent/DECISIONS.md 2026-08-31 for orchestrator's reasoning not to run a second full
      critic cycle)
- [x] UX phase marked VERIFIED in agent/STATE.md

## UI (BRAND folded in)

### UI-001 — Visual design system + UI specs

Status: VERIFIED (minor consistency fixes applied post-review, see agent/DECISIONS.md
2026-09-01)

Objective:

Produce design/UI-SYSTEM.md (visual identity/brand voice for "Clin", typography, color,
spacing, component language) and design/UI-SPEC.md (screen-level visual specs) from the
verified UX deliverables (design/journeys.md, design/information-architecture.md,
design/screen-inventory.md, design/UX-spec.md), product/prd.md, and product/prd-addendum.md.

Acceptance criteria:

- [ ] design/UI-SYSTEM.md covers brand voice/visual identity (BRAND, folded in per
      agent/DECISIONS.md), typography, color, spacing, component language, responsive rules
- [ ] design/UI-SPEC.md provides screen-level visual specs for every screen in
      design/screen-inventory.md (40 screens across AUTH/FAM/NIN/ADM/SYS)
- [ ] Visually distinguishes the three-state pending-verification badge, the
      self-reported-referencias treatment, and the paywall/contact-gate moment per the UX
      spec's decisions
- [x] UI Critic has reviewed and returned PASS or PASS_WITH_MINOR_ISSUES (agent/qa/ui-review.md,
      PASS_WITH_MINOR_ISSUES; fixes applied directly, see agent/DECISIONS.md 2026-09-01)

## TECH_ARCHITECTURE

### TA-001 — Application architecture, data model, security model, implementation plan

Status: VERIFIED

Objective:

Produce engineering/architecture.md, engineering/database.md, engineering/security.md,
engineering/analytics.md, engineering/implementation-plan.md from the verified PRD (+
addendum), UX, and UI deliverables. Must resolve the open items explicitly deferred to this
phase:

- Match Score algorithm: concrete rule table (hard filters vs. weighted factors, minimum
  compatibility threshold) — product/prd-addendum.md item.
- Paywall/entitlement mechanics: what "contactar" includes, expiration behavior, tier
  relationships — product/prd-addendum.md item.
- Funnel analytics instrumentation: separate "found a compatible match" from "contacted a
  candidate" events, per product/prd-addendum.md's resolution of the North Star confound.
- Manual verification workflow: data model/states supporting the 3-state badge (no
  verificada / en proceso / verificada) with 24-48h SLA tracking, per product/prd-addendum.md.
- Mid-flow necesidad editing after contacts exist (flagged in design/UX-spec.md Part E).
- Badge integrity on profile edits after verification (flagged in design/UX-spec.md Part E).
- Children's data as age RANGES only, never exact age/birthdate (config/CONSTRAINTS.md).
- Identity document retention/deletion policy — config/CONSTRAINTS.md flags this as an open
  human/legal decision, not yet resolved. Architecture should design the system to support
  whatever policy is eventually set (e.g. don't hardcode indefinite retention), but must not
  invent a final retention period — flag it explicitly rather than silently deciding.

Acceptance criteria:

- [x] engineering/architecture.md, database.md, security.md, analytics.md,
      implementation-plan.md produced
- [x] All open items above explicitly addressed or explicitly flagged as unresolved (not
      silently invented)
- [x] Stack matches config/CONSTRAINTS.md (Next.js/TypeScript, web-only)
- [x] Independent technical review complete — no dedicated Technical Architecture Critic
      role exists in this project's catalog, so orchestrator performed the independent
      verification pass directly (PASS_WITH_MINOR_ISSUES; one schema gap
      (`identity_document_access_log` missing from database.md) and one deferred-item note
      (admin MFA) fixed directly — see agent/DECISIONS.md 2026-09-01)

Awaiting human ARCHITECTURE_GATE approval (see below) before BUILD begins.

## BUILD

Stories below mirror engineering/implementation-plan.md's epics/story IDs (E{epic}-{seq}).
Full objective/acceptance criteria/validation text lives there — do not duplicate it here;
this section tracks status only, plus review notes. Stories within an epic can run in
parallel with other epics once their own dependencies clear (see implementation-plan.md
"Ordering").

### Epic 0 — Foundations

Blocks all feature epics — must complete first.

#### E0-01 — Repository, tooling, and CI scaffold

Status: READY
Dependencies: none.

#### E0-02 — Supabase project setup (dev + preview + prod), migrations pipeline

Status: BLOCKED (depends on E0-01)

#### E0-03 — Core schema migration: `profiles`, `perfil_familiar`, `perfil_ninera`, `zonas`

Status: BLOCKED (depends on E0-02)

#### E0-04 — Auth wiring: Supabase Auth + role-based middleware

Status: BLOCKED (depends on E0-03)

#### E0-05 — Twilio Verify integration (phone OTP)

Status: BLOCKED (depends on E0-04)

#### E0-06 — Vercel deployment pipeline (preview + production)

Status: BLOCKED (depends on E0-01, E0-02)

## Change Requests

Ad-hoc, non-PRD asks made directly in chat (see AGENTS.md, "Change Requests"). Use `CR-NNN`
IDs, distinct from PRD-derived requirement IDs used elsewhere in this backlog. Empty until
the first one comes in.

<!--
### CR-001 — [one-line description]

Status: READY
Requested: YYYY-MM-DD (chat, not in PRD)

Objective:

[what this change does]

Review: [OPTIONAL — orchestrator judgment, or REQUIRED if it touches shared state, auth,
data, or another CONSTRAINTS.md-sensitive area]
-->
