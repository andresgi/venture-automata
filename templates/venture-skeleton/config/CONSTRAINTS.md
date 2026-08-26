# Constraints

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Hard
limits the orchestrator and specialist agents must respect throughout the project,
regardless of phase. Mark a section "none known" rather than leaving it blank or inventing
content.

## Technical Constraints

- Language/stack requirements (default: TypeScript, modern Next.js — per AGENTS.md
  Implementation Rules; override here if different)
- Required or forbidden vendors/infrastructure
- Deployment target
- Data residency / compliance requirements

## Business Constraints

- Budget ceiling (if any)
- Timeline / target milestones
- Team size / available operators for manual workflows
- Legal/regulatory constraints known up front

## Legal / Data Constraints

- Sensitive data categories this venture will handle (if any), and any required review
  before real user data may be collected
- Data retention/consent requirements known up front

## Explicit Non-Goals

- [things this venture will deliberately not attempt, if known before Discovery]

## Risk Tolerance

- [e.g. "willing to launch with manual-only ops," "cannot collect PII without legal
  review first," etc.]
