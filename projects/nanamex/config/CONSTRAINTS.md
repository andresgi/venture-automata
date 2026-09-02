# Constraints

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Hard
limits the orchestrator and specialist agents must respect throughout the project,
regardless of phase. Mark a section "none known" rather than leaving it blank or inventing
content.

## Technical Constraints

- Platform target(s): **web only** for V1. No native mobile app (explicit PRD non-goal). No
  standalone backend/mobile client split needed.
- Language/stack: **Next.js (TypeScript)**, using the framework's default. Single web
  application; use Next.js API routes/server actions as the backend rather than standing up
  a separate service, unless TECH_ARCHITECTURE finds a specific reason not to.
- Required or forbidden vendors/infrastructure:
  - **No third-party KYC/identity-verification vendor for V1.** Identity verification is
    performed via **manual admin review**: the niñera uploads an ID photo, a human operator
    reviews it and manually toggles the "Identidad verificada" badge. Do not integrate an
    automated KYC provider (e.g. Truora, Metamap) for V1 — explicit founder decision,
    recorded in agent/DECISIONS.md.
  - Phone/email verification: standard verification flow (e.g. OTP/magic link via a
    conventional provider) — no vendor mandated or forbidden; Technical Architect chooses
    during TECH_ARCHITECTURE.
- Deployment target(s): not specified by the founder. Technical Architect may propose a
  standard Next.js-compatible host during TECH_ARCHITECTURE; subject to ARCHITECTURE_GATE
  approval like the rest of the architecture.
- Data residency / compliance requirements: venture operates in **México**. See "Legal / Data
  Constraints" below — identity documents and other PII require explicit handling policy
  before any real user data is collected.

## QA Ownership

- Mobile QA: **not applicable** — no native mobile app in V1 (web only). If a mobile client
  is added post-V1, this section must be revisited before that work starts.
- Web QA (Visual QA, Functional QA) is agent-driven as normal per AGENTS.md.

## Business Constraints

- Budget ceiling: none known.
- Timeline / target milestones: none known.
- Team size / available operators for manual workflows: none known — assume a small team
  (at minimum, one human operator) will be needed to perform manual identity-verification
  review and handle reports of inappropriate behavior (see PRD "Confianza y seguridad"). This
  operational load must be reflected in SOP.
- Legal/regulatory constraints known up front: none known beyond general operation in
  México — see Legal / Data Constraints for the specific sensitive-data handling gap.

## Legal / Data Constraints

- Sensitive data categories this venture will handle:
  - **Government ID images/documents** uploaded by niñeras for manual identity verification.
  - Personal contact data: phone numbers, emails, addresses/zone.
  - Indirect data about minors: number and **age ranges** of children in a family's
    household (not names, photos, or other identifying details of the children themselves —
    do not collect more than the PRD specifies).
  - Salary/expectation data (family's pay range, niñera's salary expectation).
- **Open item requiring explicit human/legal confirmation before real user data is
  collected in production**: retention and deletion policy for uploaded ID documents (how
  long they're stored, who can access them, how/when they're deleted after verification).
  This is a "destructive data implications" / "decision requiring business judgment" item
  per AGENTS.md's Failure Rules — do not silently invent a retention policy. Flag as a
  blocker before RELEASE_GATE if not resolved by then.
- Data retention/consent requirements known up front: none specified beyond the ID-document
  item above.

## Explicit Non-Goals

Mirrors PRD section 9 ("Fuera del MVP") — see config/PROJECT.md "Known Constraints on Scope"
for the full list. Also explicitly not in scope for V1's process:

- DISCOVERY and BENCHMARK as independent phases — founder supplied the PRD directly and
  chose to proceed straight to PRODUCT_GATE (see agent/DECISIONS.md).
- Automated/ML-based identity verification (KYC vendor) — manual admin review only.

## Risk Tolerance

- Willing to launch V1 with fully manual identity verification and manual admin operations
  (no automated KYC, no automated background checks).
- **Not** willing to collect real government ID documents from users in production without
  a defined retention/deletion policy — this must be resolved (human/legal decision) before
  RELEASE_GATE, even though it does not block earlier phases like UX/UI/BUILD using
  placeholder or test data.
- Pricing in PRD section 7 (MX$299 / MX$499–699) is a starting hypothesis, not an approved
  final price — treat as adjustable during PRODUCT_STRATEGY review, not as a hard constraint.
