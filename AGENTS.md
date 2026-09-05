# MVP Factory — Agent Operating Instructions

## Mission

Build and validate a V1 of whatever venture this repository (or this project directory)
currently holds — starting from project initialization and product discovery, and ending
with a functional application, operating SOPs, and complete product/technical
documentation.

The objective is not to build as much functionality as possible.

The objective is to discover and build the smallest product that solves a meaningful,
validated problem, for whatever venture this instance is running.

This file is the shared, venture-agnostic framework. It should not need editing per
venture — what changes per venture lives in config/PROJECT.md, config/CONSTRAINTS.md, and
config/WORKFLOW.md. See config/PROJECT.md for this specific venture's mission, target user,
problem, and initial concept.

## Working Principle

The repository is the source of truth.

Do not rely on previous conversation context or assume another agent remembers prior work.

Before starting any substantial work, read:

- config/PROJECT.md
- config/CONSTRAINTS.md
- config/WORKFLOW.md
- agent/STATE.md
- agent/BACKLOG.md
- agent/DECISIONS.md
- agent/BLOCKERS.md

Also read the relevant artifacts for the current project phase.

If config/PROJECT.md, config/CONSTRAINTS.md, or config/WORKFLOW.md do not exist yet, this
project has not been initialized. Do not guess at them or proceed to DISCOVERY — run
Project Initialization first (see below).

## Project Initialization

Before DISCOVERY (or any other phase) may begin, the venture must be initialized. This is
not one of the toggleable phases in config/WORKFLOW.md — it is the step that produces
config/WORKFLOW.md in the first place, so it always runs, unconditionally, exactly once per
venture.

Trigger: the user says "Initialize this project" or equivalent, or the orchestrator detects
that config/PROJECT.md, config/CONSTRAINTS.md, or config/WORKFLOW.md is missing.

Procedure:

1. Read this file (AGENTS.md) in full — the framework the venture will run under.
2. Interview the user, or derive from whatever material the user provides (a pitch doc,
   notes, an existing product/00-vision.md, prior conversation), enough information to
   populate:
   - config/PROJECT.md — venture name, one-line mission, initial concept/hypothesis,
     target user, problem, known constraints on scope.
   - config/CONSTRAINTS.md — technical, business, legal/data, and risk-tolerance
     constraints; explicit non-goals. Mark a section "none known" rather than leaving it
     blank or inventing content.
   - config/WORKFLOW.md — an explicit status (`enabled`, `disabled`, `optional`, `auto`, or
     `provided`) for every phase in the phase catalog below. Do not leave any phase unset.
     When genuinely unsure, use `auto` rather than guessing `enabled`/`disabled`. If the
     user already has a deliverable in hand for a phase, see "Fast-start" below and use
     `provided` instead of deriving it from scratch.
3. Initialize agent/STATE.md: set Current Phase to the first applicable phase (usually
   DISCOVERY, unless config/WORKFLOW.md disables it), Status to NOT_STARTED, and populate
   Phase Status for every applicable phase.
4. Initialize agent/BACKLOG.md with the first real backlog item(s) for that phase.
5. Confirm agent/DECISIONS.md, agent/BLOCKERS.md, and agent/RUNLOG.md exist (empty logs are
   fine).
6. Record that initialization is complete — a short entry in agent/DECISIONS.md is
   sufficient.

Do not begin DISCOVERY, or any other phase, until Project Initialization is complete. Do
not silently invent config/PROJECT.md or config/CONSTRAINTS.md content the user hasn't
actually provided or confirmed — ask, or mark it explicitly as an open question.

templates/venture-skeleton/ contains blank starter versions of every file this step
produces, and scripts/new-project.sh scaffolds a new venture directory from it.

### Fast-start: supplying existing deliverables

You don't have to run every phase through its agent from scratch. If you already have
requirements, an architecture, or any other phase's deliverable in hand — from prior work,
another tool, or your own judgment — skip deriving it and supply it directly:

1. Tell the orchestrator what you already have and want to skip (e.g. "I have a PRD and a
   rough architecture — skip Discovery, Benchmark, Strategy, and Brand").
2. Save the supplied material at that phase's conventional output path(s) — see the "Typical
   output(s)" column in the phase catalog above. A partial set is fine (e.g. product/prd.md
   alone, without strategy.md/v1-scope.md) — whatever you actually have.
3. In config/WORKFLOW.md, mark:
   - phases you have a deliverable for as `provided` (not `enabled`, not `disabled`).
   - phases you genuinely don't need at all (no deliverable, nothing to check) as
     `disabled`. This is the key distinction: `disabled` means no artifact is expected;
     `provided` means the artifact exists, just not agent-authored.

For a `provided` phase, the orchestrator does not delegate production to that phase's
agent. Instead it: verifies the expected artifact(s) exist at their conventional path,
runs that phase's independent critic/reviewer once in review-only mode as a sanity check
(findings are advisory — record in agent/DECISIONS.md whether you're accepting the
artifact as-is or want a revision), then marks the phase VERIFIED in agent/STATE.md. Do not
silently invent the missing parts of an incomplete `provided` deliverable — flag the gap
(agent/BLOCKERS.md, or ask) instead of fabricating the rest.

Human gates still apply normally: PRODUCT_GATE still requires your explicit approval before
BRAND/UX/UI/technical work begins even when PRODUCT_STRATEGY is `provided` rather than
`enabled`, and ARCHITECTURE_GATE still requires approval before BUILD even when
TECH_ARCHITECTURE is `provided`.

## Workflow

This process is deliberately generic so it can run any venture, not just this one. Which
phases actually apply to *this* venture — and which don't — is configured in
config/WORKFLOW.md, not hardcoded here. Read config/WORKFLOW.md before determining the next
eligible action.

### Phase catalog

Every phase below maps to a specialist role (see "Available Roles"). config/WORKFLOW.md
assigns each one a status:

- `enabled` — always runs; required for this venture's V1 to reach COMPLETE.
- `disabled` — never runs; no deliverable is expected; not applicable to this venture.
- `optional` — does not run by default. Only include it if a human or an approved backlog
  item explicitly asks for it, and record that decision in agent/DECISIONS.md before starting.
- `auto` — the orchestrator decides, based on this venture's actual product/strategy.md and
  PRD, whether the phase is needed. Record the reasoning and the include/skip decision in
  agent/DECISIONS.md the first time the phase becomes eligible.
- `provided` — the deliverable already exists, supplied directly by a human instead of
  produced by the phase's agent. The phase is still required (unlike `disabled`), but its
  producing agent is not delegated to author it from scratch. See "Project Initialization
  -> Fast-start" below for exactly how this works.

| Phase | Purpose | Primary agent(s) | Typical output(s) |
|---|---|---|---|
| DISCOVERY | Validate the venture's core assumptions with evidence | Product Researcher | product/assumptions.md, product/research.md |
| BENCHMARK | Map competitors and analogous products | Product Researcher | product/benchmark.md |
| PRODUCT_STRATEGY | Turn evidence into strategy, V1 scope, and a buildable PRD | Product Manager | product/strategy.md, product/v1-scope.md, product/prd.md |
| BRAND | Naming, voice, and identity, distinct from screen-level visual design | UI Designer / UI Critic* | (folds into UI's design/UI-SYSTEM.md unless given its own doc) |
| UX | User journeys, information architecture, screen inventory, UX states | UX Designer / UX Critic | design/journeys.md, design/information-architecture.md, design/screen-inventory.md, design/UX-spec.md |
| UI | Visual design system and screen-level UI specifications | UI Designer / UI Critic | design/UI-SYSTEM.md, design/UI-SPEC.md |
| TECH_ARCHITECTURE | Application architecture, data model, security model, implementation plan | Technical Architect | engineering/architecture.md, database.md, security.md, analytics.md, implementation-plan.md |
| BUILD | Engineering execution (includes Functional QA and Visual QA as built-in sub-steps) | Developer / Code Reviewer / Functional QA / Visual QA | application source code |
| SECURITY_REVIEW | Independent security review of the implementation | Security Reviewer | agent/qa/security-review.md |
| GROWTH | General acquisition, activation, and retention strategy | Product Manager / Product Researcher* | (no fixed convention yet) |
| SUPPLY_GROWTH | Supply-side acquisition, for two-sided marketplaces | Product Manager / Product Researcher* | (no fixed convention yet) |
| DEMAND_GROWTH | Demand-side acquisition, for two-sided marketplaces | Product Manager / Product Researcher* | (no fixed convention yet) |
| PRODUCT_ACCEPTANCE | Verify the built product against the approved PRD/scope | Product Acceptance | agent/qa/product-acceptance.md |
| SOP | Operational runbooks for this venture's manual workflows | SOP Writer | operations/sop/*, operations/SOP-INDEX.md |
| DOCUMENTATION | Product and technical documentation of what was actually built | Documentation Writer | docs/* |
| RELEASE | Final release-readiness review and the human RELEASE_GATE package | Release Reviewer | agent/gates/release-gate.md |

\* BRAND, GROWTH, SUPPLY_GROWTH, and DEMAND_GROWTH have no dedicated specialist agent in
this repository yet. When one of these is applicable and becomes eligible, route the work
to the closest existing agent listed above instead of inventing new process. If the fit is
genuinely poor, escalate instead of guessing.

### Ordering

Among the phases that are applicable (`enabled`, `provided`, or `auto`/`optional` resolved
to "include"), the relative order is fixed:

DISCOVERY -> BENCHMARK -> PRODUCT_STRATEGY -> PRODUCT_GATE (human) -> [BRAND, UX, UI, in
any useful order] -> TECH_ARCHITECTURE -> ARCHITECTURE_GATE (human) -> BUILD (including
Functional QA + Visual QA) -> SECURITY_REVIEW -> [GROWTH, SUPPLY_GROWTH, DEMAND_GROWTH, if
applicable] -> PRODUCT_ACCEPTANCE -> SOP -> DOCUMENTATION -> RELEASE -> RELEASE_GATE
(human) -> COMPLETE

Do not run a disabled phase. Do not skip an enabled phase without recording an explicit
exception in agent/DECISIONS.md. Do not silently include an optional or auto phase without
recording that decision first.

## Human Gates

Agents must stop and request human review at:

### PRODUCT_GATE
Required whenever PRODUCT_STRATEGY is applicable (`enabled`, `provided`, or `auto`/
`optional` resolved to include). Before BRAND/UX/UI/technical work begins.

### ARCHITECTURE_GATE
Required whenever TECH_ARCHITECTURE is applicable (`enabled`, `provided`, or `auto`/
`optional` resolved to include). Before substantial application implementation begins.

### RELEASE_GATE
Always required before production release, regardless of which other phases were
applicable to this venture.

Agents may prepare materials for the next phase but must not cross a human gate without explicit approval recorded in agent/DECISIONS.md.

## Change Requests

Not every request needs to go through the phase-driven workflow. Small, ad-hoc changes that
aren't in the PRD — asked for directly in chat, "vibe coded" rather than derived from
Discovery/Strategy — get a lighter lane: Change Requests.

Trigger: the user asks for something directly in chat that doesn't map to an existing PRD
requirement, and isn't a "continue" on the phase-driven backlog.

Procedure:

1. Check whether the request maps to an existing PRD requirement. If it does, it's regular
   backlog work under the relevant phase — do not create a Change Request for it.
2. If it doesn't map to the PRD, check config/CONSTRAINTS.md and product/v1-scope.md's
   non-goals (if present). If the request conflicts with either, escalate instead of
   building it — same "decision requiring business judgment" rule as elsewhere.
3. Otherwise, add it to agent/BACKLOG.md under a `## Change Requests` section, with its own
   `CR-NNN` ID (distinct from PRD-derived requirement IDs), the request, and a one-line
   objective.
4. Delegate to the Developer directly — skip Discovery/Strategy/UX/PRD ceremony and any
   human gate. Independent review (Code Reviewer, Functional QA) is the orchestrator's
   judgment call, not mandatory: skip it for trivial/cosmetic changes, include it for
   anything touching shared state, auth, data, or other CONSTRAINTS.md-sensitive areas.
5. Run the same validation as any other code change (lint, typecheck, tests, build) — the
   IMPLEMENTED/VERIFIED bar from Implementation Rules still applies.
6. Mark the Change Request IMPLEMENTED or VERIFIED in agent/BACKLOG.md (same status
   vocabulary as the rest of the backlog), and log one line in agent/RUNLOG.md.

Change Requests are deliberately walled off from the PRD: PRODUCT_ACCEPTANCE only checks
PRD-traced P0 requirements, so a Change Request will never show up there. DOCUMENTATION
should still list delivered Change Requests (e.g. a short "Change Requests Delivered"
section) so a later reviewer isn't confused about scope that never went through
PRODUCT_STRATEGY.

Do not use Change Requests to accumulate scope that should have gone through
PRODUCT_STRATEGY — if they start adding up to something structural, say so and suggest
running that phase properly instead of continuing to patch around it.

## Scope Rules

- Challenge assumptions instead of treating the initial concept as fact.
- Prefer evidence over intuition.
- Optimize aggressively for MVP simplicity.
- Do not add features merely because competitors have them.
- Prefer manual operational processes when automation is unnecessary for V1.
- Every P0 feature must map to a user problem or critical business requirement.
- Do not silently change approved product requirements.
- Record important product and technical decisions in agent/DECISIONS.md.

## Execution Rules

Work on one coherent objective at a time.

Before execution:

1. Read current project state.
2. Identify the highest-priority eligible task.
3. Understand its acceptance criteria.
4. Inspect relevant existing work.

After execution:

1. Validate the result.
2. Update relevant artifacts.
3. Update agent/STATE.md.
4. Update agent/BACKLOG.md.
5. Record important decisions.
6. Record blockers if applicable.
7. Add a concise entry to agent/RUNLOG.md.

Never claim work is complete unless its acceptance criteria have been checked.

## Distributed Worker Protocol

A venture's repository may be worked on autonomously from more than one machine (e.g. a
laptop during the day, an always-on home machine overnight). GitHub is the durable shared
checkpoint between them — not a branch that both machines commit to. This protocol exists
to prevent two workers from editing the same story at the same time, and to make sure a
worker never overwrites another worker's uncommitted or unpushed work.

### Active Worker lease

`agent/STATE.md` carries two fields:

```
Active Worker: none
Worker Lease Until: none
```

- Before beginning autonomous work on a story, a worker sets `Active Worker` to its own
  identifier (e.g. `laptop`, `home-pc`, or a machine hostname) and commits that change.
- On finishing or safely checkpointing a story, the worker sets `Active Worker` back to
  `none` and commits that change too, before considering the story "handed off."
- A worker must not begin autonomous work if `Active Worker` is already set to a value
  that is not its own and not `none` — that means another worker may still be active.
  Treat this the same as a human gate: stop and do not proceed.
- This lease is a cooperative convention, not a hard lock — it only works if every worker
  checks it before starting and updates it before stopping. It is not a substitute for the
  ordinary per-story branch model below.

### Still one story, one branch, one worker

Do not introduce a long-lived shared working branch that multiple machines push to
directly. The existing per-story branch → PR → review → merge model already isolates
concurrent work correctly: two workers only collide if they claim the *same* story at the
same time, which the Active Worker lease above is what actually prevents. A shared branch
just moves the collision risk somewhere else without removing it.

### Sync before starting work

Before starting autonomous work, a worker must sync with the remote rather than assume its
local checkout is current:

1. Confirm the local working tree is clean. If it is not, stop — do not overwrite
   uncommitted work from a previous session on this same machine.
2. Fetch `origin`.
3. If local `HEAD` is behind `origin/<default-branch>`, fast-forward. Never
   `git reset --hard origin/<default-branch>` to "sync" — that discards any local commits
   that were never pushed.
4. If local and remote history have diverged (neither is an ancestor of the other), stop.
   Do not automatically merge, rebase, or reset. This needs human review.
5. If local is ahead of remote (local commits exist that were never pushed), that is
   itself worth surfacing, not silently continuing past — a previous session likely didn't
   finish its checkpoint.

`scripts/sync-from-github.sh` implements this check-and-report logic; ventures scaffolded
from `templates/venture-skeleton/` include a copy.

### Checkpoint after verified work

Every story reaching VERIFIED must produce a real git checkpoint: commit the code changes
and the updated `agent/` tracking files together, then push the current branch to origin.
A verified story whose checkpoint was never pushed does not exist from another worker's
point of view.

Push is permitted for non-force pushes of the current working branch once a checkpoint is
ready. Force-pushing (`--force`, `-f`, `--force-with-lease`) is never permitted
autonomously, regardless of the reason — if history genuinely needs to be rewritten, that
is a human decision, made by a human, run by a human.

### Diverged history

If local and remote history have diverged, or if the Active Worker lease shows another
worker may be active, stop. Do not attempt to resolve it automatically (no
merge/rebase/reset/discard). Record it as a blocker per the Failure Rules below and wait
for human review.

### Interactive worker sessions (e.g. an always-on home machine)

A second machine (a home PC left on, reachable over Tailscale or similar) can run the same
agent CLI interactively — not headless, not on a timer — by being started manually from a
terminal or phone SSH session:

```
scripts/start-worker-session.sh <claude|opencode>
```

This: runs `sync-from-github.sh` first and refuses to proceed if it reports anything other
than up-to-date/fast-forwarded; claims the Active Worker lease (`scripts/worker-lease.sh
claim`); starts the chosen CLI inside a detached `tmux` session named `venture-worker`, so
closing the phone's SSH app just detaches rather than killing the session
(`tmux attach -t venture-worker` to reattach, `Ctrl-b d` to detach without ending it); and
guarantees the lease is released and a Telegram notification sent
(`scripts/notify-telegram.sh`, silently a no-op if `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`
aren't configured) whenever the session ends for any reason — normal exit, crash, or the
tmux session being killed — via a `trap ... EXIT` in `scripts/_run-worker-inner.sh`.

Because this is interactive, permission prompts are answered by whoever is attached to the
tmux session, not a headless process — there is no wall-clock-timeout risk to design
around, unlike a fully unattended/cron-triggered invocation would have. `worker-lease.sh`
can also be run standalone (`claim`, `release`, `release --force`, `status`) for manual
lease management, e.g. cleaning up after a session that died without releasing.

`scripts/start-worker-session.sh claude --skip-permissions` passes
`--dangerously-skip-permissions` through to the claude CLI, for the rare case where you
deliberately want to skip its permission checks for a session. This is opt-in per
invocation, never a default, and prints a loud warning every time it's used: Claude's own
CLI help text recommends that flag "only for sandboxes with no internet access," and this
machine has real push credentials to a live repo. As far as we've verified, it also
bypasses `scripts/hooks/deny-force-push.sh` and the git-push allow/deny rules in
`.claude/settings.json` — i.e. it removes the force-push protection this same protocol
depends on. Not supported for opencode (it has its own separate `permission.bash` config,
not this flag).

For a long-running process with no start/exit boundary of its own to hook a sync and
lease-claim into — e.g. `opencode web` left running for days as an "always on" mobile
front end — `start-worker-session.sh`'s auto-claim/auto-release model doesn't fit: the
server never exits between tasks, so there's nothing to trigger a release, and syncing
only once at server-start goes stale the moment another machine pushes. Use
`scripts/claim-for-session.sh` instead, immediately before starting a real work session in
that UI: it syncs and claims the lease in one step (failing loudly, per the sync rules
above, if the tree's dirty or history has diverged). Release manually with
`scripts/worker-lease.sh release` when that work session ends — there is no automatic
trigger for this path, unlike the tmux flow.

## Implementation Rules

Once software development begins:

- Use the stack(s) specified in config/CONSTRAINTS.md's Technical Constraints — per
  platform, if this venture spans more than one (e.g. a standalone backend plus a mobile
  client). config/CONSTRAINTS.md's platform-specific choices always take precedence here.
  Only if config/CONSTRAINTS.md doesn't specify a stack for a given platform, default to
  TypeScript and a modern supported Next.js version for that platform.
- Prefer simple architecture suitable for an MVP.
- Never modify production systems without explicit human approval.
- Never expose or commit secrets.
- Never commit .env files.
- Do not perform production deployment without explicit human approval.

For implementation work, run the project's available validation commands for each platform
being built — they may differ per platform (e.g. `next build` for a Next.js web/backend,
versus a mobile toolchain's own lint/typecheck/build for a React Native/Flutter/native
client):

- lint
- typecheck
- tests
- production build

A feature is IMPLEMENTED when development checks pass.

A feature is VERIFIED only after independent QA passes.

IMPLEMENTED does not mean VERIFIED.

### Manual QA for platforms without agent-drivable tooling

Some platforms (most commonly native mobile — iOS/Android) have no agent-drivable
simulator/device tooling in this framework. Check config/CONSTRAINTS.md's "QA Ownership"
section before delegating Visual QA or Functional QA for a story on such a platform:

- If QA Ownership marks a platform's QA as manual, the Developer still implements the
  story and runs every automated check available (lint, typecheck, unit tests, build) —
  do not skip these. The orchestrator does not delegate Visual QA or Functional QA to an
  agent for that story. Instead, mark the story `AWAITING_MANUAL_QA` in agent/BACKLOG.md,
  add it to agent/qa/PENDING_MANUAL_QA.md (a running list: story ID, one-line description,
  date added, what to test), and move on to the next eligible independent story in the
  same run. Do not stop and wait for the human — `AWAITING_MANUAL_QA` is not a blocker.
  Only stories that genuinely depend on the queued one (per its dependencies) stay
  BLOCKED; unrelated work continues.
- When the human reports back on a queued story, record their verdict in
  agent/qa/<story-id>-visual.md (or -functional.md) the same way an agent's finding would
  be recorded, remove it from agent/qa/PENDING_MANUAL_QA.md, and update its status
  (VERIFIED on PASS, REVISION_REQUIRED on FAIL — same as any other QA outcome).
- Code Review always stays agent-driven regardless of platform — it reviews source, not a
  running app.
- agent/qa/PENDING_MANUAL_QA.md must be empty — or every remaining entry explicitly waived
  by the human and recorded in agent/DECISIONS.md — before PRODUCT_ACCEPTANCE or RELEASE
  may proceed. The queue not blocking BUILD does not mean it's exempt from release
  readiness.
- If config/CONSTRAINTS.md doesn't address QA ownership for a platform an agent has no way
  to actually render or interact with, do not silently skip QA and do not silently attempt
  it anyway — ask the human how they want it handled before proceeding.

## Failure Rules

Do not repeatedly attempt the same unsuccessful approach indefinitely.

After approximately 3 meaningful failed attempts:

1. Stop repeating the approach.
2. Document what was attempted.
3. Identify likely root cause.
4. Add the issue to agent/BLOCKERS.md if necessary.
5. Continue with independent work if possible.

Escalate instead of guessing when there is:

- a major product ambiguity
- an architectural decision with significant downstream consequences
- a security concern
- destructive data implications
- a decision requiring business judgment

## Definition of Project Complete

The project is not complete merely because the application builds.

V1 requires the following, for every phase config/WORKFLOW.md marks `enabled` or `provided`
(or resolves an `auto`/`optional` phase to "include") — skip any item whose corresponding
phase is `disabled` or was resolved to "skip". A `provided` phase's item is satisfied by the
supplied artifact passing its review-only sanity check, not by agent-authored work.

- Approved product definition (PRODUCT_STRATEGY)
- Approved V1 scope (PRODUCT_STRATEGY)
- Completed PRD (PRODUCT_STRATEGY)
- UX flows (UX)
- Technical architecture (TECH_ARCHITECTURE)
- Functional web application (BUILD)
- P0 requirements implemented (BUILD)
- P0 requirements independently verified (PRODUCT_ACCEPTANCE)
- Functional QA passed (BUILD)
- Mobile/responsive QA passed (BUILD / UI)
- Critical security issues resolved (SECURITY_REVIEW)
- Analytics specification implemented (TECH_ARCHITECTURE / BUILD)
- Operational processes documented (SOP)
- SOPs for manual workflows (SOP)
- Local development documentation (DOCUMENTATION)
- Technical architecture documentation (DOCUMENTATION)
- Known limitations documented (DOCUMENTATION)
- Release readiness review completed (RELEASE)
- agent/qa/PENDING_MANUAL_QA.md empty, or every remaining entry explicitly waived and
  recorded in agent/DECISIONS.md (see "Manual QA for platforms without agent-drivable
  tooling")

Only a human can approve RELEASE_GATE.

# Agent Delegation

The primary agent acts as the PROJECT ORCHESTRATOR.

The orchestrator should delegate specialized work when an appropriate specialist exists.

## Available Roles

### Product Researcher

Use for:

- product assumption research
- customer problem research
- market research
- competitor research
- analogous product research
- evidence gathering

The researcher produces evidence and artifacts.

The researcher does not approve its own output.

### Product Critic

Use after meaningful product research or product-definition artifacts are produced.

The critic independently reviews the artifact against:

- evidence quality
- reasoning quality
- task acceptance criteria
- unresolved risk
- MVP discipline

The critic must not modify the artifact being reviewed.

### Other roles

A specialist agent exists for every other phase in the catalog above: Product Manager, UX
Designer, UX Critic, UI Designer, UI Critic, Technical Architect, Developer, Code Reviewer,
Functional QA, Visual QA, Security Reviewer, Product Acceptance, SOP Writer, Documentation
Writer, and Release Reviewer. Their full behavior specifications live in .claude/agents/*.md
(or .opencode/agents/*.md, if using OpenCode) — read the relevant agent file before
delegating to it for the first time in a run, rather than relying on this summary.

## Research Review Loop

For important Discovery and Benchmark tasks:

1. Orchestrator identifies eligible backlog task.
2. Product Researcher executes the task.
3. Product Critic independently reviews the result.
4. Orchestrator reads both artifact and review.
5. If verdict is PASS:
   - accept the task.
6. If verdict is PASS_WITH_MINOR_ISSUES:
   - orchestrator determines whether minor issues can be deferred.
7. If verdict is REVISE:
   - send specific critique back to Product Researcher.
   - researcher revises the artifact.
   - Product Critic reviews again.
8. If verdict is BLOCK:
   - record blocker or request human input.

Maximum review cycles for the same task:

3

After three failed review cycles, stop the loop and document the unresolved problem.

## State Ownership

Only the orchestrator may:

- move the project to another phase
- mark a human gate approved
- declare a phase complete

Specialist agents may update their assigned artifacts but should not independently advance project workflow state.

If the repository is being worked on from more than one machine, the orchestrator also
owns the `Active Worker` / `Worker Lease Until` fields in `agent/STATE.md` — see
"Distributed Worker Protocol" above.

## Backlog Status Vocabulary

Use only:

BLOCKED
READY
IN_PROGRESS
IMPLEMENTED
AWAITING_MANUAL_QA
REVISION_REQUIRED
VERIFIED
DEFERRED

Meaning:

BLOCKED
Cannot currently begin.

READY
Eligible for execution.

IN_PROGRESS
Agent is actively working on it.

IMPLEMENTED
Artifact/work has been produced but has not passed independent review.

AWAITING_MANUAL_QA
Implemented and passed all automated checks; independent QA is a pending manual human
test (per config/CONSTRAINTS.md "QA Ownership") rather than agent-delegated. Does NOT
block the orchestrator's "continue" loop — proceed to the next eligible independent
story. Only stories that genuinely depend on this one remain BLOCKED until it clears.

REVISION_REQUIRED
Independent review found substantive issues.

VERIFIED
Acceptance criteria and required review have passed.

DEFERRED
Explicitly postponed by decision.