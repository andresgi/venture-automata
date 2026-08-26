# Enabled Workflow

Configures which phases from AGENTS.md's phase catalog apply to this venture. See AGENTS.md
("Workflow" section) for what each status means and which agent each phase routes to.

Populated during Project Initialization. Every phase below defaults to `auto` — replace each
one with `enabled`, `disabled`, `optional`, or `provided` once you actually know, and leave
`auto` only for phases you genuinely want the orchestrator to decide (it will record its
reasoning in agent/DECISIONS.md the first time the phase becomes eligible). Do not leave any
phase unset.

Already have a PRD, an architecture, or another phase's deliverable in hand and want to skip
straight to building? Mark that phase `provided` instead of `enabled`/`disabled`, and see
AGENTS.md's "Project Initialization -> Fast-start" for how to supply it.

DISCOVERY: disabled
BENCHMARK: disabled
PRODUCT_STRATEGY: provided
BRAND: disabled
UX: enabled
UI: enabled
TECH_ARCHITECTURE: provided
BUILD: enabled
SECURITY_REVIEW: enabled
GROWTH: auto
SUPPLY_GROWTH: disabled
DEMAND_GROWTH: disabled
PRODUCT_ACCEPTANCE: enabled
SOP: enabled
DOCUMENTATION: enabled
RELEASE: enabled

## Notes

- DISCOVERY, BENCHMARK: disabled — founder supplied a PRD directly and explicitly asked to
  skip these; no research deliverable is expected.
- PRODUCT_STRATEGY: provided — product/prd.MD supplied by founder. product/strategy.md and
  product/v1-scope.md were not separately supplied; treated as an accepted partial
  deliverable per AGENTS.md Fast-start, not fabricated. Still requires the review-only
  product-critic pass and PRODUCT_GATE human approval before BRAND/UX/UI/technical work.
- BRAND: disabled — founder explicitly asked to skip; no separate brand deliverable
  expected (naming/voice, if needed, will fold into UI's design system when that phase
  runs).
- UX, UI: enabled — PRD lists a screen inventory (section 5) but no user journeys,
  information architecture, or visual design system; these still need to be produced by
  their specialist agents.
- TECH_ARCHITECTURE: provided — engineering/architecture.md supplied (stack: Facturama,
  Supabase, Vercel), but it is a one-line stack list only, missing data model, security
  model, analytics, and implementation plan. Review-only pass must flag this gap explicitly
  rather than the orchestrator inventing the missing parts; likely needs a revision cycle
  with the Technical Architect agent to fill in the remainder before ARCHITECTURE_GATE.
- SUPPLY_GROWTH, DEMAND_GROWTH: disabled — this is a single-sided product (an issuer
  invoicing their own customers), not a two-sided marketplace.
- GROWTH: auto — general acquisition/retention strategy relevance for this MVP is unclear
  at initialization time; decision deferred to when this phase becomes eligible, per
  AGENTS.md.
- SECURITY_REVIEW: enabled — non-negotiable given fiscal/tax PII and Facturama credential
  handling.
