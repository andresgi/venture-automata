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

Status: VERIFIED (2026-09-02; Code Reviewer PASS_WITH_MINOR_ISSUES, both items fixed —
lang="es" correction, CI proven green on PR #1
https://github.com/andresgi/venture-automata/pull/1; see agent/RUNLOG.md)
Dependencies: none.

#### E0-02 — Supabase project setup (dev + preview + prod), migrations pipeline

Status: VERIFIED (2026-09-02; scope adjusted to `nanamex-dev` only — `preview`/`prod`
creation deferred, human decision, see agent/DECISIONS.md; Code Reviewer
PASS_WITH_MINOR_ISSUES, sole required fix was removing the reviewer's own stray test
artifact, done; migration pipeline empirically verified locally and against the real
hosted nanamex-dev instance; see agent/RUNLOG.md)

#### E0-03 — Core schema migration: `profiles`, `perfil_familiar`, `perfil_ninera`, `zonas`

Status: VERIFIED (2026-09-02; Code Reviewer round 1 REVISE — 5 Important RLS/FK/CI issues,
all fixed via follow-up migration `20260902000007_security_hardening.sql`; round 2
PASS_WITH_MINOR_ISSUES, one trivial README doc-lag fixed directly by orchestrator; launch
city corrected mid-story from an unspecified default to Monterrey, human decision, see
agent/DECISIONS.md; migrations pushed to hosted `nanamex-dev`, confirmed applied; see
agent/RUNLOG.md and agent/reviews/code-E0-03-review.md)

#### E0-04 — Auth wiring: Supabase Auth + role-based middleware

Status: VERIFIED (2026-09-02; Code Reviewer round 1 REVISE — 1 required AUTH-04 login
error-state fix, arising from the correo-gating redefinition below, not a Developer defect;
fixed and re-verified, round 2 PASS_WITH_MINOR_ISSUES; see agent/DECISIONS.md and
agent/reviews/code-E0-04-review.md). Surfaced and resolved a real architecture/UX conflict
— correo verification redefined as a hard login gate, teléfono remains the soft gate (human
decision, see agent/DECISIONS.md; design/journeys.md and design/UX-spec.md updated
accordingly).

#### E0-05 — Twilio Verify integration (phone OTP)

Status: VERIFIED (2026-09-02; Code Reviewer PASS_WITH_MINOR_ISSUES, no required changes;
3 optional non-blocking follow-ups tracked; Twilio SDK usage verified against the real
package's type definitions, not just mocks — no real Twilio credentials exist yet, manual
smoke test deferred to pre-RELEASE_GATE; see agent/DECISIONS.md and
agent/reviews/code-E0-05-review.md)

#### E0-06 — Vercel deployment pipeline (preview + production)

Status: VERIFIED (2026-09-03; `nanamex-preview` Supabase project created as a prerequisite,
human-authorized Vercel CLI access; Code Reviewer round 1 REVISE — an undisclosed
production-target deployment attempt in Vercel's history contradicted the documented
"never tested" claim; Developer root-caused it as their own CLI setup activity (Vercel
auto-classifies a brand-new project's first deployment as Production, compounded by a
Root Directory resolution quirk from deploying out of a subdirectory), confirmed no
content was ever served, confirmed it can't recur on real Git-triggered builds; round 2
PASS, all 3 acceptance criteria verified independently against live Vercel API data — see
agent/DECISIONS.md and agent/reviews/code-E0-06-review.md). Production Vercel env
currently reuses `nanamex-dev` credentials (no dedicated `nanamex-prod` project yet) —
explicitly flagged as a pre-RELEASE_GATE open item. Live end-to-end confirmation that a
real merge to `main` shows deployment status "Ignored" is deferred to that first merge
(human-approved deferral, not a gap in this story).

**This completes Epic 0 (Foundations).**

## Epic 1 — Familia Onboarding

Stories mirror engineering/implementation-plan.md's Epic 1. Full objective/acceptance
criteria/validation text lives there — this section tracks status only, plus review notes.

#### E1-01 — AUTH-01 Landing + role selection

Status: VERIFIED (2026-09-03; wired real UI-SYSTEM design tokens into the app for the
first time (Inter/Fraunces, color/spacing/radius/type-scale tokens); Code Reviewer
PASS_WITH_MINOR_ISSUES; Visual QA REVISE round 1 — desktop hero photo left a growing blank
gap instead of filling remaining width, fixed and re-verified via `getBoundingClientRect()`
measurements (0px gap at 1024–1920px), round 2 PASS; role pre-fill into AUTH-02 verified
end-to-end; no-child-imagery safety check passed both rounds; see agent/DECISIONS.md,
agent/reviews/code-E1-01-review.md, agent/qa/e1-01-visual-qa.md).

**Pre-RELEASE_GATE backlog item:** the hero photo (CC BY 2.0 Wikimedia Commons, adult woman
alone in a kitchen) passes the hard no-child-imagery rule but does not literally depict a
caregiver/family moment as AUTH-01's spec calls for. Developer ran an exhaustive search for
a better-matching freely-licensed alternative and found none reachable from this
environment (Unsplash/Pexels blocked without an API key; Openverse unusable; Wikimedia
Commons has no suitable adults-only caregiving-moment photo). Human accepted the current
photo as a placeholder. **Before RELEASE_GATE:** replace with either a paid stock license,
an Unsplash/Pexels API key (to let the Developer search those catalogs), or a
human-supplied image — and update the alt text (`app/page.tsx`) to match whatever photo is
finally used.

#### E1-02 — AUTH-02/03 registration + verification (familia)

Status: VERIFIED (2026-09-03; scope narrowed at delegation time since the story's literal
acceptance criteria reference FAM-01 (E1-03, depends on this story) and server-side
`Contactar`/entitlement enforcement (E5-01, several epics away) — neither exists yet.
Delivered scope: confirmed/fixed the correo-hard-gate + teléfono-soft-gate flow end-to-end;
found and fixed a real gap — `/verificar` had no spec-required "Continuar" soft-gate action
(AUTH-03), only an OTP-submit button mislabeled the same way, conflating "submit code" with
"proceed regardless of teléfono status." Code Reviewer PASS, no required changes —
independently verified route gating is genuinely role-only (never conditioned on
`phone_verified`), the new "Continuar" link is unconditional, and the scope reduction was
legitimate (confirmed FAM-01/Contactar genuinely don't exist in the codebase yet); see
agent/reviews/code-E1-02-review.md).

**Deferred, not silently skipped:** FAM-01 (E1-03's scope), server-side Contactar/
entitlement enforcement (E5-01's scope), and a "cuenta no verificada" banner UI treatment
(unbuilt anywhere yet — flagged as an open item for whichever of FAM-13/FAM-01 builds
first, not assigned an ID here).

### E1-03 — FAM-01 onboarding perfil familiar

Status: VERIFIED (2026-09-03; Code Reviewer PASS_WITH_MINOR_ISSUES; Visual QA initial
REVISE, fixed and follow-up PASS_WITH_MINOR_ISSUES; browser rendering unavailable, source-
level review covered 375, 430, 768, and 1440px)

Dependencies: E1-02, E0-03 (`zonas` seeded).

Delivered: required `nombre` + `zona` onboarding form, server-side role and zona
validation, zona autocomplete with real-id submission and pin confirmation, FAM-01 gate
from `/familia`, and responsive/tokenized form states. The interim success redirect remains
`/familia` until E2-01 creates FAM-03; tracked below.

Follow-up: E2-01 must change the successful FAM-01 redirect from `/familia` to FAM-03 once
that route exists.

#### E2-01 — FAM-03 crear necesidad: steps 1–7 + draft autosave

Status: VERIFIED (2026-09-03; Code Review PASS_WITH_MINOR_ISSUES; Functional QA
PASS_WITH_MINOR_ISSUES; Visual QA final PASS; browser rendering unavailable, source-level
review covered 375, 430, 768, and 1440px)

Dependencies: E1-03, E0-03.

Delivered: responsive mobile seven-step wizard and desktop single scrollable seven-section
form, fixed age-range choices, zona autocomplete, editable schedules/modalidad/payment/date/
responsibilities, anchored desktop rail, desktop/mobile autosave controls, resumable drafts,
server-side validation/authorization, and atomic RPC persistence. E2-02 review/publication is
explicitly deferred.

#### E2-02 — FAM-03 revisión + publicar

Status: VERIFIED (2026-09-03; implementation picked up mid-flight from a separate tool
session — see agent/DECISIONS.md "E2-02 continuity" entry. Code Reviewer round 1 REVISE
(3 required changes: profile_completeness/perfil_completo field mismatch defeating the
ranking tie-break; publish RPC trusted arbitrary/ineligible candidate IDs and snapshots
with no server-side re-validation; broken "Editar necesidad" empty-state link for
published necesidades). Developer fixed all 3, regression-tested each fix by reverting and
confirming the new tests fail, then restoring. Code Reviewer round 2: PASS_WITH_MINOR_ISSUES.
Functional QA (real local Supabase, not mocks) found a new High-severity bug in the
previously-untested populated-candidates path — `disponibilidad` snake_case/camelCase
mismatch silently zeroed the 25-point availability match factor for every real candidate,
already live today, not a future-only risk as first assessed. Developer fixed (mirrored
the existing correct translation pattern), Code Reviewer and Functional QA both
independently re-verified: PASS. See agent/reviews/code-E2-02-review.md (three review
rounds preserved) and agent/qa/e2-02-functional-qa.md.

**Known limitation carried forward:** `/familia`'s dashboard doesn't yet list active
necesidades, so the empty-state's "Volver a mis necesidades" recovery link, while no
longer broken, has limited practical value until E2-03/E2-04. Editing an active necesidad
remains genuinely unbuilt (E2-04's scope).

Dependencies: E2-01, E3-02.

Objective:

Add the review step for a completed necesidad, publish it from `borrador` to `activa`,
trigger initial match computation, and redirect to FAM-04 with populated or empty results.

Acceptance criteria:

- [x] Publish transitions `estado: borrador -> activa` server-side.
- [x] Publishing calls `computeMatches` and persists the initial match/pipeline results.
- [x] Successful publish redirects to FAM-04.
- [x] Zero eligible niñeras reaches the documented FAM-04 empty state instead of an error.
- [x] Server-side authorization prevents publishing another family's draft.

Validation: `npm test -- --run` (21 files, 142 tests), `npm run test:db`, `npm run lint`,
`npm run typecheck`, `npm run check:secrets`, and `npm run build` all pass. Build emits only
the existing Supabase Node 20 deprecation warning.

#### E2-03 — FAM-02 dashboard (Mis necesidades)

Status: VERIFIED (2026-09-03; Code Review PASS_WITH_MINOR_ISSUES — 2 non-blocking issues,
both fixed directly: a `loading.tsx` route-segment scope note corrected (see Known
limitation below, not fully fixed) and a code comment mischaracterizing the mobile
sticky-bottom-button spec text corrected to accurately describe the simplification.
Visual QA PASS — real browser/Playwright verification via a full register→confirm→login
flow against real local Supabase, including forcing the loading skeleton to render by
locking the `necesidades` table; one minor finding (18px mobile touch target on card
action links, below the 44px convention) fixed directly. See
agent/reviews/code-E2-03-review.md and agent/qa/e2-03-visual-qa.md.)

Dependencies: E2-02.

Delivered: real FAM-02 dashboard replacing the interim drafts-only placeholder — card grid
of all borrador+activa necesidades (zona, modalidad, status chip, plain-text pipeline
summary for active necesidades), empty state, loading skeleton (`app/familia/loading.tsx`),
and the FAM-01 completion gate preserved unchanged. Also fixed a latent gap from E2-02:
`text-h2` was referenced in FAM-04's JSX but never defined in `globals.css`.

**Known limitation (non-blocking, tracked):** `app/familia/loading.tsx` uses Next.js's
route-segment `loading.tsx` convention, which applies to the entire `/familia/*` subtree,
not just this page — navigating to `/familia/perfil`, `/familia/necesidad`, or
`/familia/necesidad/[id]` will transiently show FAM-02's skeleton shape instead of a
route-appropriate one. Low-impact (self-corrects within a frame or two), not fixed in this
story; revisit if it becomes noticeable once those routes see more real traffic, e.g. by
adding narrower nested `loading.tsx` files or restructuring the route groups.

### E3-01 — Hard filter + weighted scoring implementation

Status: VERIFIED (2026-09-03; Code Review final PASS_WITH_MINOR_ISSUES; full 32 weighted-
factor pass/fail combinations covered)

Dependencies: E0-03, E2-01.

Delivered: pure typed matching scorer with the single modalidad hard filter, five named
weights from architecture §15, 60% compatibility threshold, availability coverage across
all requested days, and comprehensive edge-case tests. Verification status is not an input
to the scoring path. E3-02 ranking/computeMatches remains separate.

Validation: `npm test` (185 tests), `npm run lint`, `npm run typecheck`,
`npm run check:secrets`, and `npm run build` all pass.

### E3-02 — Ranking + `computeMatches` service

Status: VERIFIED (2026-09-03; Code Review PASS_WITH_MINOR_ISSUES)

Dependencies: E3-01.

Delivered: repository-backed matching service using E3-01 scoring, modalidad hard-filter
exclusion, deterministic ranking by score descending, profile completeness descending,
created-at ascending, then id ascending. Verification status is intentionally absent from
the ranking/tie-break path. E2-02 can call this service when implementing publication.

Validation: `npm test` (189 tests), `npm run lint`, `npm run typecheck`,
`npm run check:secrets`, and `npm run build` all pass.

### E4-01 — FAM-04 listado de candidatas

Status: VERIFIED (2026-09-03; Code Review PASS_WITH_MINOR_ISSUES after fixes; Functional QA
PASS_WITH_MINOR_ISSUES with accepted scope exception)

Dependencies: E3-02.

Delivered: populated, empty, loading, and retry states; candidate cards with avatar/name,
live TrustBadge, Match Score, and Spanish checklist labels; collapsible necesidad summary;
current candidate eligibility filtering; deterministic snapshot/live-row ranking; and safe
handling for missing live candidate records. FAM-05 filtering, FAM-06 profile details, and
favorites remain deferred to their owning stories.

Accepted scope exception: the empty-state action remains `Volver a mis necesidades` linking
to `/familia`. The UI spec says `Editar necesidad`, but editing an already-published necesidad
is E2-04 scope and is not implemented or faked here (human decision 2026-09-03).

Validation: `npm test -- --run --no-file-parallelism` (225 tests), `npm run lint`,
`npm run typecheck`, `npm run check:secrets`, and `npm run build` all pass.

### E4-02 — FAM-05 filtros

Status: VERIFIED (2026-09-03; Code Review PASS_WITH_MINOR_ISSUES after fixes; Functional QA
PASS_WITH_MINOR_ISSUES after fixes)

Dependencies: E4-01.

Delivered: responsive FAM-05 filter controls for zona, modalidad, pay overlap, and selected
availability days. Mobile uses an accessible bottom-sheet dialog with draft/apply behavior;
desktop uses a persistent sidebar with live updates. Applied filters update the candidate list
without navigation and persist in URL query state. Existing base empty/error states remain
distinct from the no-results-after-filter message.

Validation: `npm test -- --run --no-file-parallelism` (229 tests), `npm run lint`,
`npm run typecheck`, `npm run check:secrets`, and `npm run build` all pass.

### E4-03 — FAM-06 perfil de niñera detail + pipeline record auto-creation

Status: VERIFIED (2026-09-03; round 1 — Code Review REVISE (Docker/test:db unavailable, so
DB/RPC runtime behavior unverified), Functional QA FAIL (BUG-001: mobile overlay/references
gaps), Visual QA REVISE (V01-V05: tooltip clipping, tablet full-bleed, loading composition,
error-state conflation, reference spacing). Developer fixed the E4-03 DB probe's
setup/teardown/role-handling bugs (app source for BUG-001/V01-V05 was already correct from
a prior session) and got `npm run test:db` running end-to-end against real Postgres. Round
2 — Code Review PASS_WITH_MINOR_ISSUES, Functional QA PASS, Visual QA PASS. See
agent/reviews/code-E4-03-review.md and agent/qa/e4-03-functional.md / e4-03-visual.md for
both rounds, and agent/DECISIONS.md 2026-09-03 "E4-03 VERIFIED".)

Dependencies: E4-01.

Delivered: authenticated candidate-detail route, current eligibility and ownership checks,
live trust badge, full match/profile/reference detail, FAM-04 profile links, and an atomic
database RPC that creates the frozen pipeline snapshot and durable analytics events. Repeated
compatible views are idempotent through a database unique index; every view remains logged.
Favorites/contact/report remain deferred to E4-04/E5/E9.

Validation: `npm test -- --run --no-file-parallelism` (245 tests), `npm run lint`,
`npm run typecheck`, `npm run check:secrets`, `npm run build`, and `npm run test:db`
(including the E4-03 RPC probe, run twice consecutively) all pass.

**Non-blocking housekeeping item carried to the PR step:** unrelated
`projects/test-invoice-generator/*` deletions and root `.claude/settings.json` sit in the
working tree from outside this story — exclude them from the E4-03 commit/PR.

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
