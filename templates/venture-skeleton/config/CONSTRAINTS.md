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

## QA Ownership

- Mobile QA: manual (default). If this venture includes a native mobile app, Visual QA and
  Functional QA for mobile screens are performed by the human unless this section
  explicitly enables Maestro MCP with an Android Emulator. When enabled, state the
  emulator/API configuration and where the Maestro flows live. The Developer still runs
  automated checks (lint/typecheck/unit tests/build) as always. Code Review remains
  agent-driven regardless of platform.

### Maestro MCP (optional)

- Status: disabled (default; set to enabled only after installing Maestro CLI, configuring
  the MCP server, and confirming an Android Emulator is available to the testing harness)
- MCP server command: `maestro mcp`
- Android app ID: [package name]
- Build/install command: [venture-specific command]
- Flow directory: [venture-specific path]
- Runner machine: [e.g. `ubuntu-home-pc`; must have KVM access]
- AVD name: [pre-created Android Virtual Device name]
- ADB device ID: [e.g. `emulator-5554`]
- Emulator launch mode: headless (`-no-window`); optional extra args: [value or none]
- Evidence directory: [e.g. `agent/qa/evidence/mobile/`]

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
