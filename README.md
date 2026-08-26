# MVP Factory

A reusable, venture-agnostic framework for running Claude Code (or OpenCode) as a
disciplined product/engineering team: discover a real problem, define the smallest V1 that
tests it, build it, and ship it — with independent review and human approval gates at the
points that matter.

This repository is the framework itself, not a single product. It's meant to be reused
across many ideas, not rewritten per venture.

## The two layers

**Framework** (shared, you shouldn't need to edit this per venture):

- `AGENTS.md` — the rulebook: phases, human gates, scope/execution rules, delegation.
- `CLAUDE.md` — Claude Code-specific glue (what "continue" and "Initialize this project" do).
- `.claude/agents/` and `.opencode/agents/` — 17 specialist subagents (one per phase:
  product research, UX, UI, architecture, build, QA, security, docs, etc.), duplicated in
  both dialects so the same framework runs under Claude Code or OpenCode.

**Venture** (per-project, this is what actually changes):

- `config/PROJECT.md` — this venture's mission, initial hypothesis, target user, problem.
- `config/CONSTRAINTS.md` — hard limits: tech stack, legal, budget, non-goals.
- `config/WORKFLOW.md` — which phases apply to this venture, and how (see below).
- `agent/STATE.md`, `BACKLOG.md`, `DECISIONS.md`, `BLOCKERS.md`, `RUNLOG.md` — the live
  execution trace.
- `product/`, `design/`, `engineering/`, `operations/` — the actual deliverables.

## Two ways to run a venture

**At the repo root**, directly — one venture per checkout. Simplest option; do this if
you're not planning to run multiple ventures side by side.

**Under `projects/<name>/`** — a monorepo of ventures, all sharing the one root
`AGENTS.md`/`CLAUDE.md`/agent set. Scaffold one with:

```bash
./scripts/new-project.sh invoice-pilot
cd projects/invoice-pilot
```

Nesting works because Claude Code walks up the directory tree to find `CLAUDE.md`/
`AGENTS.md` — a venture under `projects/<name>/` automatically inherits the shared
framework with no duplication, and relative paths (`config/...`, `agent/...`) resolve
correctly since the tool's working directory is inside that venture's own folder.

For a fully standalone copy (its own git history, no shared parent) instead, just copy this
whole repository.

## Quickstart

**Start a venture from scratch:**

```
Initialize this project.
```

The orchestrator reads `AGENTS.md`, interviews you (or derives from whatever material you
give it) to populate `config/PROJECT.md`, `config/CONSTRAINTS.md`, and `config/WORKFLOW.md`,
then sets up `agent/STATE.md`/`BACKLOG.md` — and stops there so you can review before any
real work begins.

**Already have a PRD and/or an architecture, want to skip Discovery/Benchmark/Strategy/Brand?**
Say so during initialization (or any time). Drop your PRD at `product/prd.md`, your
architecture at `engineering/architecture.md`, and mark those phases `provided` instead of
`enabled` in `config/WORKFLOW.md`. The orchestrator sanity-checks what you supplied instead
of authoring it from scratch, then moves straight to UX/build. See `AGENTS.md`, "Project
Initialization → Fast-start."

**Day to day, once initialized:**

```
continue
```

Reads `config/WORKFLOW.md` + `agent/STATE.md`/`BACKLOG.md`, picks the next eligible action,
delegates to the right specialist, runs it through independent review, and stops at a human
gate (`PRODUCT_GATE`, `ARCHITECTURE_GATE`, `RELEASE_GATE`) when one applies.

**Small, ad-hoc changes not in the PRD** ("add a dark mode toggle"): just ask directly in
chat. These go through a lighter `CR-NNN` lane in `agent/BACKLOG.md` — tracked and validated
to the same bar as everything else, but without the full phase ceremony. See `AGENTS.md`,
"Change Requests."

## `config/WORKFLOW.md` statuses

Every phase in `AGENTS.md`'s catalog (`DISCOVERY`, `BENCHMARK`, `PRODUCT_STRATEGY`, `BRAND`,
`UX`, `UI`, `TECH_ARCHITECTURE`, `BUILD`, `SECURITY_REVIEW`, `GROWTH`, `SUPPLY_GROWTH`,
`DEMAND_GROWTH`, `PRODUCT_ACCEPTANCE`, `SOP`, `DOCUMENTATION`, `RELEASE`) gets one of:

| Status | Meaning |
|---|---|
| `enabled` | Always runs, agent-produced, required for COMPLETE. |
| `disabled` | Never runs, no deliverable expected, not applicable to this venture. |
| `optional` | Skipped unless explicitly requested; requires a recorded decision to include. |
| `auto` | Orchestrator decides based on the venture's actual strategy/PRD, and records why. |
| `provided` | Deliverable already exists (you supplied it) — reviewed, not authored from scratch. |

Example, an internal tool with no brand/growth work:

```
BRAND: disabled
SUPPLY_GROWTH: disabled
SOP: enabled
```

Example, a two-sided marketplace:

```
BRAND: enabled
SUPPLY_GROWTH: enabled
DEMAND_GROWTH: enabled
```

## Repository layout

```
AGENTS.md, CLAUDE.md          shared framework rules
.claude/agents/, .opencode/agents/   17 specialist subagents (both dialects)
scripts/new-project.sh        scaffold a new venture into projects/<name>/
templates/venture-skeleton/   blank config/ + agent/ starter files
projects/<name>/              (optional) one subfolder per venture, monorepo-style
config/, agent/, product/,
design/, engineering/,
operations/                   the currently-running venture's own data (if run at root)
```

## Known limitations

- `BRAND`, `GROWTH`, `SUPPLY_GROWTH`, and `DEMAND_GROWTH` have no dedicated specialist agent
  yet — work routes to the closest existing one (see `AGENTS.md`'s phase catalog footnote).
- No automated check that `.claude/agents/` and `.opencode/agents/` stay in sync — they're
  meant to be behaviorally identical (only frontmatter/tool-permission syntax differs), but
  nothing currently enforces that beyond manual review.
- No validator for `config/WORKFLOW.md` — a missing or misspelled phase status currently
  just fails silently at runtime rather than up front.
- No documented path for "graduating" a `projects/<name>/` venture into its own standalone
  repository later.

## Learn more

- `AGENTS.md` — the full rulebook: phases, gates, scope rules, delegation, Change Requests.
- `CLAUDE.md` — Claude Code-specific orchestrator triggers.
- `.claude/agents/*.md` (or `.opencode/agents/*.md`) — each specialist's exact behavior spec.
