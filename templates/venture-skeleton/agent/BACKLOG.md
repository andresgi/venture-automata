# Project Backlog

## INIT — Project Initialization

### INIT-001 — Populate project configuration

Status: READY

Objective:

Derive or interview for enough information to populate config/PROJECT.md,
config/CONSTRAINTS.md, and config/WORKFLOW.md (see AGENTS.md, "Project Initialization").

Acceptance criteria:

- [ ] config/PROJECT.md completed (venture name, mission, initial concept, target user,
      problem, known constraints)
- [ ] config/CONSTRAINTS.md completed (technical, business, legal/data, non-goals, risk
      tolerance — or explicitly marked "none known" per section)
- [ ] config/WORKFLOW.md has an explicit status for every phase in AGENTS.md's phase
      catalog (no phase left as the unpopulated `auto` default without deliberate intent)
- [ ] agent/STATE.md updated: Current Phase set to the first applicable phase, Phase Status
      populated for every applicable phase
- [ ] agent/BACKLOG.md updated with the first real backlog item(s) for that phase
- [ ] Initialization recorded in agent/DECISIONS.md

Do not begin DISCOVERY, or any other phase, until this task is VERIFIED.

## Change Requests

Ad-hoc, non-PRD asks made directly in chat (see AGENTS.md, "Change Requests"). Use `CR-NNN`
IDs, distinct from PRD-derived requirement IDs used elsewhere in this backlog. Empty until
the first one comes in.

<!--
### CR-001 — [one-line description]

Status: READY
Requested: YYYY-MM-DD (chat, not in PRD)

Objective:

[what this change does]

Risk tier: [LOW | MEDIUM | HIGH | CRITICAL — impact rationale]

Verification: [required checks and independent review/QA implied by the tier]

Context package:

- Read: [specific requirements, sections, source/test paths]
- Do not read by default: [known unrelated artifacts/areas]
- Validate: [commands and evidence]
-->
