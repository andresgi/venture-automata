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

DISCOVERY: auto
BENCHMARK: auto
PRODUCT_STRATEGY: auto
BRAND: auto
UX: auto
UI: auto
TECH_ARCHITECTURE: auto
BUILD: auto
SECURITY_REVIEW: auto
GROWTH: auto
SUPPLY_GROWTH: auto
DEMAND_GROWTH: auto
PRODUCT_ACCEPTANCE: auto
SOP: auto
DOCUMENTATION: auto
RELEASE: auto

## Notes

[record the reasoning behind any non-obvious status here, e.g. why a phase is disabled or
optional for this venture]
