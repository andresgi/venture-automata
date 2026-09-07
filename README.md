# MVP Factory

A reusable, venture-agnostic framework for running Claude Code, OpenCode, or Codex as a
disciplined product/engineering team: discover a real problem, define the smallest V1 that
tests it, build it, and ship it — with independent review and human approval gates at the
points that matter.

This repository is the framework itself, not a single product. It's meant to be reused
across many ideas, not rewritten per venture.

## The two layers

**Framework** (shared, you shouldn't need to edit this per venture):

- `AGENTS.md` — the rulebook: phases, human gates, scope/execution rules, delegation.
- `agents/` — seven shared role definitions, with separate modes for design, review, and operations.
- `adapters/` — Claude, OpenCode, and Codex templates containing native configuration.
- `.claude/agents/`, `.opencode/agents/`, `.codex/agents/` — generated native specialist
  definitions. Existing specialist names remain stable. The three product specialists
  remain unchanged in the original Claude/OpenCode locations during this scoped migration.
- `CLAUDE.md` — a generated entry point importing the shared `AGENTS.md` instructions.
- `docs/mobile-testing.md` — optional Maestro MCP setup and evidence requirements for
  Android Emulator testing.

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

**Under `projects/<name>/`** — scaffold a venture with its own copy of the framework:

```bash
./scripts/new-project.sh invoice-pilot
cd projects/invoice-pilot
```

The scaffold includes shared definitions, adapter templates, native agent files, and
venture configuration templates. This avoids depending on harness-specific parent-directory
agent discovery. Framework changes are propagated deliberately with `scripts/sync-framework.sh`.

For a standalone directory, use `./scripts/new-project.sh invoice-pilot --path ../invoice-pilot`.
Initialize its git history and remote separately. The script refuses an existing destination.

For a mobile venture, the scaffold also includes a Maestro starter flow and scripts:

```bash
./scripts/mobile-build.sh       # MOBILE_BUILD_COMMAND
./scripts/mobile-install.sh     # MOBILE_APK_PATH
./scripts/mobile-test.sh        # maestro/smoke.yaml
```

Set `MOBILE_APP_ID`, replace the smoke-flow selectors, and enable Maestro MCP in
`config/CONSTRAINTS.md` only after an Android Emulator and the `maestro mcp` server are
available to the harness. Mobile QA remains manual by default.

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

Shared instructions and harness configuration are maintained separately:

```text
agents/
  architect.md
  ui-ux.md
  developer.md
  qa.md
  docs.md
  growth.md
  branding.md
adapters/
  opencode/
  codex/
  claude/
```

Each shared file has named modes. The renderer embeds one mode per native specialist,
preserving separate author and reviewer invocations. Product roles are deliberately excluded
from this consolidation; no `agents/product.md` is created.

```
AGENTS.md                    shared rules and orchestration loop
CLAUDE.md                    generated Claude entry point
agents/                      shared behavior, no harness metadata
adapters/                    native templates and role mapping
.claude/agents/, .opencode/agents/, .codex/agents/   native specialist definitions
scripts/render-adapters.py   deterministic rendering and drift checks
scripts/new-project.sh        scaffold a new venture into projects/<name>/
templates/venture-skeleton/   blank config/ + agent/ starter files
maestro/                      repeatable Android Maestro flows (in a scaffolded venture)
projects/<name>/              (optional) one subfolder per venture, monorepo-style
config/, agent/, product/,
design/, engineering/,
operations/                   the currently-running venture's own data (if run at root)
```

## Editing agents and adapters

Edit behavior in `agents/` and harness configuration in `adapters/<harness>/templates/`.
The common mapping is `adapters/roles.json`. Then regenerate:

```bash
python3 scripts/render-adapters.py
python3 scripts/render-adapters.py --check
python3 -B -m unittest discover -s tests -v
```

The renderer requires Python 3.9 or newer and no third-party Python dependencies. Generated
files are committed so native discovery does not depend on running a setup command at launch.
It refuses locally modified outputs, preserves unrelated agents, and never overwrites runtime
settings (`.claude/settings.json`, `opencode.jsonc`, or `.codex/config.toml`). Move intentional
native edits into adapter templates before regenerating. `--preflight` checks for installation
conflicts without writing; `--harness claude|opencode|codex` selects one adapter.

Model and permission settings remain adapter-specific. Codex inherits the caller's settings;
Claude retains its existing model choices. Restart or reload the harness after changing native
definitions. No provider login, background session, or external service is started by rendering.

## Known limitations

- Product Researcher, Product Manager, and Product Critic remain in the original Claude and
  OpenCode files; Codex renders their existing instructions from the Claude copies. This is
  an explicit migration exception, not a completed neutral product-role migration.
- No validator for `config/WORKFLOW.md` yet.
- Android mobile testing is opt-in. Projects must provide their own build command, APK
  path, package ID, and flow selectors; the starter scripts fail when these are missing.
- Permission syntax and enforcement differ between harnesses. Shared instructions describe
  review boundaries; shell access is not restricted to report directories by those instructions.
- The current tmux launcher, worker leases, force-push hook, and checkpoint lifecycle are
  unchanged. Paseo integration and coordination hardening are separate work.
- Native files are generated and checked offline. Live model execution and tool availability
  must still be verified in each user's installed harness. See each adapter README.

## Learn more

- `AGENTS.md` — phases, gates, orchestration, delegation, and Change Requests.
- `agents/*.md` — shared specialist instructions and modes.
- `adapters/README.md` — adapter contract, rendering, and preservation rules.
- `docs/framework-changes.md` — framework migration record and validation.
