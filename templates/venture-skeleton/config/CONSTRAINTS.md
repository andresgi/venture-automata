# Constraints

Populated during Project Initialization (see AGENTS.md, "Project Initialization"). Hard
limits the orchestrator and specialist agents must respect throughout the project,
regardless of phase. Mark a section "none known" rather than leaving it blank or inventing
content.

## Technical Constraints

- Platform target(s): web, mobile (iOS/Android), a standalone backend/API, or a
  combination — state explicitly. Don't assume a single web stack if this venture needs a
  mobile app and/or a separate backend.
- Language/stack requirements, per platform if more than one applies. AGENTS.md's
  Implementation Rules default to TypeScript + a modern Next.js version — that default
  applies only where nothing more specific is stated here. Anything specified below
  overrides it for this venture. For a mobile app + backend, spell out each platform
  separately, e.g.:
  - Backend/API: [e.g. Node.js/TypeScript, or your choice]
  - Mobile client: [e.g. React Native/Expo, Flutter, native Swift/Kotlin]
  - Web client (if any): [e.g. Next.js, or "none — mobile-only"]
- Required or forbidden vendors/infrastructure
- Deployment target(s) — per platform if more than one (e.g. App Store/Play Store for
  mobile, hosting provider for the backend)
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
