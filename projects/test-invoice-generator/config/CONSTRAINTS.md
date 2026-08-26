# Constraints

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Hard
limits the orchestrator and specialist agents must respect throughout the project,
regardless of phase. Mark a section "none known" rather than leaving it blank or inventing
content.

## Technical Constraints

- Stack: TypeScript + modern Next.js (per AGENTS.md default; consistent with founder-
  supplied architecture note).
- Required vendors (per engineering/architecture.md, founder-supplied):
  - Facturama — CFDI 4.0 generation, stamping, cancellation, PDF/XML.
  - Supabase — PostgreSQL database, Auth, Storage.
  - Vercel — frontend + Next.js hosting.
- Facturama API credentials must never be exposed to the frontend (backend-only).
- Monetary calculations must be performed server-side, not in the client.
- Deployment target: Vercel (per architecture note).
- Data residency / compliance requirements: not specified beyond CFDI 4.0/SAT compliance
  itself — none known beyond that.
- Note: engineering/architecture.md as supplied is a one-line stack list only — it does not
  yet cover data model, security model, or implementation plan. This is a known gap to
  surface (not fabricate) when TECH_ARCHITECTURE's review-only pass runs.

## Business Constraints

- Budget ceiling: none known.
- Timeline / target milestones: none known.
- Team size / available operators for manual workflows: none known.
- Legal/regulatory constraints known up front: invoices must satisfy Mexican SAT CFDI 4.0
  requirements (enforced via Facturama); no additional regulatory constraints specified.

## Legal / Data Constraints

- Sensitive data categories handled: Mexican fiscal/tax identity data (RFC, Razón Social,
  Código Postal, Régimen Fiscal) and customer PII (email) for both issuers and customers.
- No explicit data retention/consent policy was supplied — flagged as an open question,
  not to be decided unilaterally (relevant to SECURITY_REVIEW and any real user data
  collection).

## Explicit Non-Goals

- Complemento de pago
- Nómina (payroll)
- Carta Porte
- Multi-currency
- Advanced accounting
- Bank reconciliation
- Recurring invoices
- Inventory management
- Full SAT catalog management UI
- Not a marketplace; single-sided product (issuer generates invoices for their own
  customers) — SUPPLY_GROWTH/DEMAND_GROWTH phases are not applicable.

## Risk Tolerance

- None explicitly stated by founder. Given fiscal/tax data and legally-binding invoice
  stamping are involved, treat correctness of CFDI data and protection of Facturama
  credentials as high-risk-tolerance-zero areas by default until told otherwise.
