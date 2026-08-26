# Decision Log

Important product, technical, operational, and workflow decisions are recorded here.

Do not record trivial implementation choices.

---

## 2026-08-25 — Project Initialization (Fast-start)

Decision: Initialized "Test Invoice Generator" using the Fast-start path. The founder
supplied product/prd.MD and engineering/architecture.md directly and asked to skip
DISCOVERY, BENCHMARK, PRODUCT_STRATEGY-from-scratch, and BRAND.

Resulting config/WORKFLOW.md statuses:
- DISCOVERY: disabled — no research deliverable expected; founder skipped explicitly.
- BENCHMARK: disabled — same.
- PRODUCT_STRATEGY: provided — product/prd.MD is the artifact of record. Only prd.MD was
  supplied (no product/strategy.md or product/v1-scope.md); accepted as a partial
  deliverable per AGENTS.md Fast-start rather than fabricated.
- BRAND: disabled — founder skipped explicitly; no separate brand deliverable expected.
- UX: enabled — not supplied; PRD only lists a screen inventory, not journeys/IA/UX spec.
- UI: enabled — not supplied.
- TECH_ARCHITECTURE: provided — engineering/architecture.md is the artifact of record, but
  it is a one-line stack list (Facturama, Supabase, Vercel) only. Data model, security
  model, analytics spec, and implementation plan are missing. This gap will be surfaced
  explicitly (not fabricated) at TECH_ARCHITECTURE's review-only pass, likely requiring a
  revision cycle with the Technical Architect agent before ARCHITECTURE_GATE.
- SUPPLY_GROWTH / DEMAND_GROWTH: disabled — single-sided product, not a marketplace.
- GROWTH: left `auto` — relevance undetermined at init time; decision deferred to when the
  phase becomes eligible.
- BUILD, SECURITY_REVIEW, PRODUCT_ACCEPTANCE, SOP, DOCUMENTATION, RELEASE: enabled — all
  standard for this venture; SECURITY_REVIEW is non-negotiable given fiscal/tax PII
  (RFC, Razón Social) and Facturama credential handling.

Next step: PRODUCT_STRATEGY's review-only pass (Product Critic reviewing product/prd.MD
as supplied), then PRODUCT_GATE human approval before BRAND/UX/UI/technical work begins.
No human gate has been crossed yet.
