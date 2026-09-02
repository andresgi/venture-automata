# Decision Log

Important product, technical, operational, and workflow decisions are recorded here.

Do not record trivial implementation choices.

---

## 2026-08-31 — Project Initialization complete

Venture "Nanamex" (product name "Clin") initialized from a founder-supplied PRD (saved to
product/prd.md verbatim). config/PROJECT.md, config/CONSTRAINTS.md, and config/WORKFLOW.md
populated. Three decisions were confirmed with the human before populating config:

1. **DISCOVERY and BENCHMARK: disabled for V1.** The PRD is the founder's hypothesis, not
   market-validated evidence. Given the choice to run Discovery/Benchmark first vs. skip
   straight to PRODUCT_GATE, the human chose to skip. PRODUCT_STRATEGY is marked `provided`
   (not `enabled`) — the Product Manager will not author the PRD from scratch; instead
   Product Critic reviews it once in review-only mode (see backlog item PS-001) before
   PRODUCT_GATE.
2. **Tech stack: Next.js + TypeScript**, single web application (web only — no native mobile
   app per PRD non-goals, no separate backend service planned for V1).
3. **Identity verification for V1: manual admin review**, not an automated KYC vendor. The
   niñera uploads an ID photo; a human operator reviews it and manually sets the "Identidad
   verificada" badge. No third-party KYC integration (e.g. Truora, Metamap) in V1.

Follow-on open item (not a blocker for BUILD, but must be resolved before RELEASE_GATE):
retention/deletion policy for uploaded ID documents has not been defined. Flagged in
config/CONSTRAINTS.md "Legal / Data Constraints" and agent/STATE.md "Human Blocker" — needs
explicit human/legal confirmation before real user data is collected in production.

Also decided: SUPPLY_GROWTH and DEMAND_GROWTH are `optional` (not required for V1 COMPLETE);
GROWTH is `disabled` in favor of those two, since Clin is a two-sided marketplace. BRAND is
`enabled` but folded into UI Designer's work (no dedicated Brand agent, and the product name
"Clin" already exists from the PRD).

## 2026-08-31 — PS-001: Product Critic review of PRD, verdict REVISE, accepted with addendum

Product Critic reviewed product/prd.md in review-only mode (agent/qa/prd-review.md).
Verdict: REVISE, citing two critical issues and six "Important" issues. Orchestrator brought
both critical issues to the human directly (not resolved unilaterally, per Failure Rules —
"decision requiring business judgment"). Human decisions:

1. **North Star metric vs. paywall confound**: keep the MX$299 paywall as scoped, but
   instrument the funnel to separately track "found a compatible match" vs. "contacted a
   candidate," so payment friction doesn't get misread as a matching/trust failure. Recorded
   in product/prd-addendum.md.
2. **Manual verification SLA/visibility**: target 24–48h turnaround; unverified niñeras
   remain visible/matchable while pending (badge appears only once approved). Recorded in
   product/prd-addendum.md.
3. **Remaining six "Important" issues** (Match Score weights, paywall feature-gating
   mechanics, niñera self-serve browsing, referencias verified-vs-self-reported, reported-
   profile interim handling, "rango de edad" wording): accepted as explicit spikes, deferred
   to the owning downstream phase (UX, TECH_ARCHITECTURE, SOP) rather than resolved now.
   Each is listed individually in product/prd-addendum.md and must be explicitly answered by
   its owning phase — not silently invented — before that phase's artifact is done.

**PRODUCT_STRATEGY phase accepted as-is (PRD + addendum), not sent back for a rewrite.**
product/prd.md remains unmodified; product/prd-addendum.md is the authoritative supplement
downstream phases must also read.

## 2026-08-31 — PRODUCT_GATE approved

Human explicitly approved PRODUCT_GATE: "Sí, apruebo PRODUCT_GATE, continúa." Basis:
product/prd.md + product/prd-addendum.md (see PS-001/PS-002 in agent/BACKLOG.md). PRODUCT_
STRATEGY phase marked VERIFIED. BRAND/UX/UI/TECH_ARCHITECTURE work may now begin. Per
config/WORKFLOW.md ordering, proceeding with UX first (journeys/IA/screen inventory), then UI
(with BRAND folded in per earlier decision), then TECH_ARCHITECTURE.

## 2026-08-31 — UX phase VERIFIED

UX Designer produced design/journeys.md, design/information-architecture.md,
design/screen-inventory.md, design/UX-spec.md (UX-001), explicitly resolving all five UX
decisions delegated by product/prd-addendum.md (niñera hybrid discovery model, referencias
visual distinction, three-state pending-verification treatment, paywall gate scoped to
contact/interview-request only, admin-internal reported-profile handling).

UX Critic reviewed (UX-002, agent/qa/ux-review.md): PASS_WITH_MINOR_ISSUES. Two "Important"
internal-consistency issues found (email/phone verification hard-gate-vs-soft-gate
contradiction between journeys.md and screen-inventory.md; ambiguity in information-
architecture.md/UX-spec.md over when a Pipeline record is created relative to the
addendum's "found a match" vs. "contacted" event split) plus minor issues (FAM-10 message
field vs. no-chat non-goal, missing confirm step on admin "Eliminar cuenta").

Orchestrator judgment: issues were narrow and mechanical (contradictions between documents,
not design gaps), so sent back to UX Designer for a direct fix pass rather than a full
revision cycle. Fixes applied: verification gate resolved as a soft gate (necesidad creation
allowed pre-verification; required before contacting); Pipeline record now explicitly created
on first favorite/full-profile-view (state=Nueva), not only at contact, matching the
addendum's event-tracking need; minor issues fixed; three new open items flagged for
TECH_ARCHITECTURE in UX-spec.md Part E (mid-flow necesidad editing after contacts exist,
badge integrity on profile edits after verification, niñera decline-signal scope).

Given the narrow, mechanical nature of the fixes (document-consistency corrections, not new
design decisions), orchestrator accepted the result without a second full UX Critic cycle.
**UX phase marked VERIFIED.** Proceeding to UI (with BRAND folded in).

## 2026-09-01 — UI phase (with BRAND folded in) VERIFIED

UI Designer produced design/UI-SYSTEM.md and design/UI-SPEC.md (UI-001): warm/editorial
visual direction (Inter + Fraunces, terracotta accent, flat elevation), covering all 37
screens in design/screen-inventory.md, with the four UX-decision-critical treatments
(three-state TrustBadge, un-badged referencias, non-alarming paywall gate, weight-agnostic
Match Score) explicitly designed.

UI Critic reviewed (agent/qa/ui-review.md): PASS_WITH_MINOR_ISSUES. Confirmed the 37-screen
coverage was legitimate (screen-inventory.md actually lists 37, not 40 as originally
assumed in the review brief — corrected here for the record). Found two "Medium" issues
touching trust-signal integrity (TrustBadge geometry claim vs. NIN-03/NIN-08 specs
contradicting each other; AUTH-03 reusing the reserved trust hue, diluting the badge
system's scarcity principle) plus three minor items (breakpoint mismatch, child-imagery
rule ambiguity, missing "permission denied" state spec).

Orchestrator judgment: same pattern as UX — issues were narrow document-consistency
corrections and one color-token substitution, not new design decisions, so sent back to UI
Designer for a direct fix pass rather than a full revision cycle. All five issues resolved:
TrustBadge documented as color/icon/label-invariant with intentional scale variants (compact/
banner/large-standalone) rather than claiming pixel-identical geometry; AUTH-03's
verification-success state now uses a neutral treatment instead of the reserved trust hue;
breakpoint reconciled to ≥1280px for 3-column desktop layouts; no-child-imagery rule
clarified to cover landing/marketing photography explicitly (privacy/safety reasoning); a
"permission denied" cross-cutting state spec added.

Accepted without a second full UI Critic cycle given the narrow, mechanical nature of the
fixes. **UI phase (BRAND folded in) marked VERIFIED.** Proceeding to TECH_ARCHITECTURE —
ARCHITECTURE_GATE (human approval) required before BUILD begins.

## 2026-09-01 — TECH_ARCHITECTURE phase complete, awaiting ARCHITECTURE_GATE

Technical Architect produced engineering/architecture.md, database.md, security.md,
analytics.md, implementation-plan.md (TA-001). Stack: Next.js/TypeScript, web-only, no
separate backend (per config/CONSTRAINTS.md); Supabase (Postgres/Auth/Storage), Vercel,
Stripe, Twilio, Resend, PostHog, Sentry as vendor choices, each justified against V1 load.

All 8 items explicitly deferred to this phase were concretely resolved: Match Score rule
table (1 hard filter + 5 weighted factors, 60% compatibility threshold, verification status
excluded from tie-break to avoid implicit deprioritization); paywall/entitlement mechanics
(account-wide 30-day uncapped `contacto_30d`, MX$299, stacking); funnel analytics split
(`compatible_match_found` vs `candidate_contacted` as distinct events, implementing the
addendum's North Star fix); verification workflow data model (3-state enum, niñeras stay
`publicado` while `en_proceso`); mid-flow necesidad editing (live re-match, frozen snapshots
on already-contacted pipeline rows); badge integrity (identity-field edits reset to
`en_proceso` for re-review, non-identity edits don't); children's data (age-range enum only,
no exact-age/birthdate column anywhere in the schema — structurally enforced); ID-document
retention explicitly left unresolved (env-gated no-op purge job, flagged again as a
RELEASE_GATE blocker, not invented).

No dedicated Technical Architecture Critic role exists in this project's catalog.
Orchestrator performed the independent verification pass directly: PASS_WITH_MINOR_ISSUES.
Found one Important gap (security.md and implementation-plan.md referenced an
`identity_document_access_log` audit table that database.md's schema never actually
defined) and one Minor gap (admin MFA recommended in security.md but no corresponding
implementation-plan story or explicit deferral note). Both fixed directly by Technical
Architect: table added to database.md §10a; admin MFA explicitly noted as deferred to a
pre-RELEASE_GATE checklist item, not BUILD-blocking.

**Additional item surfaced by the Architect for human judgment, not resolved
unilaterally**: PRD section 7 lists a MX$499-699 "búsqueda premium" tier as part of V1
monetization (marked "Ejemplo"), but no PRD/UX/UI requirement defines what it actually
contains. The Architect did not build it and recommends either dropping it from V1 or
defining its scope before selling it.

**Human decision: dropped from V1.** Only the base `contacto_30d` tier (MX$299/30 days,
uncapped) is built. Recorded in product/prd-addendum.md. Architecture/implementation-plan
already reflect this (premium tier was never built), so no engineering docs need revision.

**ARCHITECTURE_GATE: not yet approved.** Human requested to review
engineering/architecture.md, database.md, security.md, analytics.md, and
implementation-plan.md before deciding. Awaiting that review — do not begin BUILD.

## 2026-09-02 — ARCHITECTURE_GATE approved

Human explicitly approved: "I approve technical architecture." Basis: engineering/
architecture.md, database.md, security.md, analytics.md, implementation-plan.md (TA-001),
independently verified by the orchestrator 2026-09-01 (PASS_WITH_MINOR_ISSUES, both gaps
fixed). TECH_ARCHITECTURE phase marked VERIFIED. BUILD may now begin.

## 2026-09-02 — E0-02: Supabase preview/prod project creation deferred (dev only for now)

During E0-02 (Supabase project setup), the Developer created `nanamex-dev` (ref
`rgqncanghlvlzrzlgkzi`, São Paulo/`sa-east-1`) but stopped before creating
`nanamex-preview`/`nanamex-prod`. Reason: the Supabase org already holds two unrelated
pre-existing projects (`clin-be`, `diamora` — confirmed unrelated to this venture, not to be
touched); creating `nanamex-dev` as a 3rd project succeeded with no free-tier warning,
suggesting the org may be on a paid plan where each additional project carries incremental
cost (~$10/mo order of magnitude), which the Developer could not confirm via the CLI. Per
AGENTS.md Failure Rules ("decision requiring business judgment"), this was escalated to the
human rather than guessed.

**Human decision: skip preview/prod project creation for now — dev only.** E0-02's
migrations pipeline should be built/validated against `nanamex-dev` only.
`nanamex-preview`/`nanamex-prod` creation is deferred to a later point (human will decide
when, likely tied to actually needing a preview/production deploy). E0-06 (Vercel
deployment pipeline) and any story assuming a preview/prod Supabase instance should treat
this as an open dependency, not build against instances that don't exist yet.

## 2026-09-02 — Standing authorization: git push + PR per BUILD story

For the remainder of BUILD, the orchestrator may commit, push a branch, and open a PR for
each VERIFIED story without asking each time (so CI proves green — same pattern used for
E0-01/PR #1), batching related stories into one PR when it makes sense (e.g. all of
Epic 0 in one PR). **Merging any PR still always requires separate explicit human
approval** — this authorization covers push/PR-open only, not merge. Human confirmed this
standing policy explicitly (chose "Auto push+PR per story" over asking each time or
manual handling) rather than being asked before every individual push, to avoid
interrupting for ~50 more implementation-plan.md stories.
