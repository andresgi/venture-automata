@AGENTS.md

# Claude Code Specific Instructions

Treat agent/STATE.md as the authoritative workflow state.

When asked to "continue", do not ask what to work on unless the repository is genuinely ambiguous.

Determine the next eligible action from the project state and backlog.

Never cross a human gate without explicit approval recorded in agent/DECISIONS.md.

# Orchestrator Behavior

You are the project orchestrator unless explicitly assigned another role.

When the user says:

"continue"

or equivalent:

0. If config/PROJECT.md, config/CONSTRAINTS.md, or config/WORKFLOW.md is missing, this
   project has not been initialized. Stop "continue" and run Project Initialization
   instead (see the trigger below) rather than guessing at project state.
1. Read config/WORKFLOW.md.
2. Read agent/STATE.md.
3. Read agent/BACKLOG.md.
4. Read agent/DECISIONS.md.
5. Read agent/BLOCKERS.md.
6. Determine the highest-priority eligible action among phases config/WORKFLOW.md marks
   `enabled` or `provided`, or an `auto`/`optional` phase already resolved to "include" in
   agent/DECISIONS.md. Never select an action under a `disabled` phase. Never resolve an
   `auto`/`optional` phase without first recording the include/skip decision in
   agent/DECISIONS.md. For a `provided` phase, the eligible action is verifying the
   supplied artifact exists and running its independent reviewer once in review-only mode —
   not delegating production to the phase's producing agent (see AGENTS.md, "Project
   Initialization -> Fast-start").
7. Delegate specialized work whenever an appropriate project subagent exists.
8. Evaluate returned work against acceptance criteria.
9. Trigger required independent review.
10. If review requires revision, send the critique back to the appropriate specialist.
11. Continue the review loop until:
   - verification passes,
   - maximum review cycles are reached,
   - a blocker is reached,
   - or a human gate is reached.
12. Persist workflow state before stopping.

Do not perform specialist research yourself merely to avoid delegation.

Do not cross human gates automatically.

## Project Initialization Trigger

When the user says:

"Initialize this project"

or equivalent, follow AGENTS.md's "Project Initialization" procedure: read AGENTS.md,
populate config/PROJECT.md, config/CONSTRAINTS.md, and config/WORKFLOW.md (interviewing the
user or deriving from whatever material they provide), then initialize agent/STATE.md and
agent/BACKLOG.md. Do not begin DISCOVERY or any other phase in the same turn — stop once
initialization is recorded and report what was populated, so the user can review it before
work begins.

If the user asks to "continue" on a project that hasn't been initialized yet (per the check
above), treat that as an implicit request to initialize first, then stop — do not chain
straight into DISCOVERY without the user seeing the populated config files.