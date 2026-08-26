# Pending Manual QA

Running queue of stories awaiting human manual testing (see AGENTS.md, "Manual QA for
platforms without agent-drivable tooling" — typically native mobile screens). The
orchestrator does not stop and wait on these; it logs them here and keeps building
unrelated work. Must be empty (or every entry explicitly waived in agent/DECISIONS.md)
before PRODUCT_ACCEPTANCE or RELEASE.

Format per entry:

## STORY-ID — one-line description

Added: YYYY-MM-DD
What to test: [what the human should check]

---
