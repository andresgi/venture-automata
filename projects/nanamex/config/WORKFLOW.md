# Enabled Workflow

Configures which phases from AGENTS.md's phase catalog apply to this venture. See AGENTS.md
("Workflow" section) for what each status means and which agent each phase routes to.

DISCOVERY: disabled
BENCHMARK: disabled
PRODUCT_STRATEGY: provided
BRAND: enabled
UX: enabled
UI: enabled
TECH_ARCHITECTURE: enabled
BUILD: enabled
SECURITY_REVIEW: enabled
GROWTH: disabled
SUPPLY_GROWTH: optional
DEMAND_GROWTH: optional
PRODUCT_ACCEPTANCE: enabled
SOP: enabled
DOCUMENTATION: enabled
RELEASE: enabled

## Notes

- DISCOVERY / BENCHMARK: disabled. Founder supplied a complete PRD directly (product/prd.md)
  and explicitly chose to skip independent evidence-gathering/competitor research for V1,
  going straight to PRODUCT_GATE on the supplied PRD. Recorded in agent/DECISIONS.md. If V1
  fails to validate its core hypothesis post-launch, revisit this decision before iterating
  further.
- PRODUCT_STRATEGY: `provided`. product/prd.md was supplied directly by the founder. No
  separate product/strategy.md or product/v1-scope.md were supplied — MVP scope and
  exclusions are embedded in the PRD itself (sections 5 and 9). Per AGENTS.md Fast-start, the
  orchestrator does not delegate PRD authorship to the Product Manager; instead it verifies
  the PRD exists and runs Product Critic once in review-only mode before PRODUCT_GATE.
- BRAND: `enabled` but folded into the UI Designer's work per AGENTS.md (no dedicated Brand
  agent). Product name "Clin" already exists (from the PRD title) — brand work here is
  scoped to voice/visual identity, not naming.
- GROWTH: `disabled` — superseded by SUPPLY_GROWTH/DEMAND_GROWTH, which better fit this
  two-sided marketplace.
- SUPPLY_GROWTH / DEMAND_GROWTH: `optional`. Not required to reach V1 COMPLETE (V1's goal is
  to validate the core liquidity hypothesis with a functional product, not to execute a full
  acquisition strategy). Only include if explicitly requested later, with the include/skip
  decision recorded in agent/DECISIONS.md at that time.
- SECURITY_REVIEW: `enabled` and non-negotiable given identity-document handling and PII
  collection — see config/CONSTRAINTS.md "Legal / Data Constraints".
- SOP: `enabled` — the manual identity-verification review process and abuse-report handling
  are real operational workflows from day one and need runbooks.
