# Project Backlog

## INIT — Project Initialization

### INIT-001 — Populate project configuration

Status: VERIFIED

Objective:

Derive or interview for enough information to populate config/PROJECT.md,
config/CONSTRAINTS.md, and config/WORKFLOW.md (see AGENTS.md, "Project Initialization").

Acceptance criteria:

- [x] config/PROJECT.md completed (venture name, mission, initial concept, target user,
      problem, known constraints)
- [x] config/CONSTRAINTS.md completed (technical, business, legal/data, non-goals, risk
      tolerance — or explicitly marked "none known" per section)
- [x] config/WORKFLOW.md has an explicit status for every phase in AGENTS.md's phase
      catalog (no phase left as the unpopulated `auto` default without deliberate intent)
- [x] agent/STATE.md updated: Current Phase set to the first applicable phase, Phase Status
      populated for every applicable phase
- [x] agent/BACKLOG.md updated with the first real backlog item(s) for that phase
- [x] Initialization recorded in agent/DECISIONS.md

## PRODUCT_STRATEGY — provided (review-only)

### PS-001 — Review-only verification of supplied PRD

Status: READY

Objective:

product/prd.MD was supplied directly by the founder (Fast-start). Verify it exists and is
usable, then run the Product Critic once in review-only mode against it (evidence quality,
reasoning quality, MVP discipline, unresolved risk). Do not delegate PRD authorship to the
Product Manager agent — the critic reviews the existing artifact only.

Acceptance criteria:

- [ ] product/prd.MD confirmed present and covers: target user, core flow, MVP feature
      list, data model sketch, key business rules, explicit out-of-scope list, success
      criteria (it does, per initial read)
- [ ] Product Critic has reviewed product/prd.MD in review-only mode and produced a verdict
- [ ] Orchestrator has recorded, in agent/DECISIONS.md, whether the PRD is accepted as-is
      or needs founder revision, and noted the accepted gap that product/strategy.md and
      product/v1-scope.md were not separately supplied
- [ ] PRODUCT_GATE presented to the founder for explicit approval before BRAND/UX/UI/
      technical work begins

Do not begin UX, UI, or TECH_ARCHITECTURE work until PRODUCT_GATE is approved.
