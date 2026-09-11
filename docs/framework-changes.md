# Framework changes

## 2026-09-11 — Frontend component organization convention from architect

Added a "Frontend Component Organization" subsection to `agents/architect.md`'s
Repository Structure responsibilities: declare a component directory convention (default
lightweight two-tier `components/ui/` primitives + `components/[feature]/` composed
components, seeded from `design/UI-SYSTEM.md`'s inventory) so `developer`'s reuse audit
has a concrete place to check before building near-duplicate components. Full Atomic
Design taxonomy (atoms/molecules/organisms/templates) is an explicit option, not the
default — only justified when venture scale warrants the extra navigation overhead.

## 2026-09-11 — Design source precedence and pre-implementation audit for developer

Added a "Design Source Precedence" rule to `agents/developer.md` for UI stories
(UI-SYSTEM.md > UI-SPEC.md > mockups > UX-spec.md when they conflict) and a
"Pre-Implementation Design Audit" step: before implementing a UI screen, check for
token/spec/mockup deviations, structural mismatches, and component-reuse opportunities,
resolving mechanical conflicts via the precedence order and escalating only genuine
product/scope decisions. Adapted from a past project's Stitch-to-Claude prompt workflow —
kept the conflict-audit and reuse-discipline ideas, dropped the per-screen human-approval
gate (too heavy for the autonomous orchestrator loop) and the React Native/Atomic Design
folder taxonomy (stack-specific, belongs in a venture's own architecture.md, not the
shared framework).

## 2026-09-11 — Real-reference grounding and screen previews for UI design

`ui-designer`'s Benchmark step now requires 3-5 concrete, specific real-app references
before drafting the design system, instead of a generic mood board. Added an optional
Mobbin MCP integration (`config/CONSTRAINTS.md`, mirroring the existing Maestro MCP
pattern) as the preferred source when enabled; falls back to targeted WebSearch/WebFetch
or user-supplied references when disabled. Also added a Screen Preview step: `ui-designer`
now produces static HTML mockups per key screen under `design/mockups/` so a human can
visually review the proposed design before ARCHITECTURE_GATE/BUILD, rather than only
reading `design/UI-SPEC.md` prose. Visual QA (`ui-critic`/`visual-qa`) remains at
milestone/journey scope, not per-story — considered and explicitly rejected escalating it
to per-story granularity. Also considered and rejected pushing the design system to a
claude.ai/design project via the DesignSync tool (deferred, not implemented) and the
`nexu-io/open-design` MCP (rejected on trust grounds: unverifiable star count for a
brand-new repo, unrecognized claimed integrations, and a BYOK proxy that would forward API
keys through an unvetted third-party daemon).

## 2026-09-09 — Opt-in Codex permission bypass for worker sessions

`scripts/start-worker-session.sh codex` retains Codex's normal permission behavior.
Passing `--skip-permissions` now explicitly starts Codex with
`--dangerously-bypass-approvals-and-sandbox`, matching the wrapper's existing opt-in model
for Claude. Updated the venture skeleton so framework syncs preserve this behavior.

## 2026-09-07 — Headless Android QA runner

Added named-AVD headless boot, readiness, and safe-stop scripts for a KVM-enabled Ubuntu
runner. Mobile install/test scripts now require device readiness and produce timestamped
Maestro/JUnit evidence. Enabling Maestro MCP still requires one-time runner evidence and
an explicit venture constraint.

## 2026-09-07 — Session-limit Telegram watchdog

Added an advisory tmux-pane watchdog for Claude Code, OpenCode, and Codex worker sessions.
It uses venture-local, non-secret output patterns to notify Telegram once when a limit is
likely detected or terminal progress stalls. It never sends input, changes work, or alters
the worker process or lease.

Claude Code permission requests are additionally forwarded through its native Notification
hook. OpenCode and Codex permission prompts use separately configurable, advisory terminal
patterns and never receive automatic approval.

## 2026-09-07 — Token-conscious BUILD execution

Added provider-neutral Minimum Sufficient Context Packages, risk-based verification,
diff-first review, milestone-level Visual QA, and concise current-state handoffs. These
changes reduce repeated context loading while preserving heightened review for changes with
security, data, authorization, or journey-level impact.

## 2026-09-07 — Shared agents and three harness adapters

Status: VERIFIED for the offline migration — independent code review and all seven offline
tests passed. Live harness delegation remains an explicit unverified integration check.

User-authorized scope: populate the seven shared role files and implement Claude, OpenCode,
and Codex adapters. Preserve product files and existing product roles. No venture initialization,
Paseo installation, session lifecycle redesign, or automatic git checkpoint is part of this work.

Shared behavior now lives in `agents/`. UI/UX, QA, and documentation retain named modes and
independent reviewer ownership. Existing native specialist names remain available. Growth and
branding receive explicit definitions, with existing phase applicability and human gates intact.
The shared orchestration loop moved from the Claude entry point into `AGENTS.md`.

Native configuration lives in adapter templates. A dependency-free Python renderer embeds
exactly one mode into each native definition, detects drift, and refuses customized outputs.
Product definitions remain unchanged; Codex reads their existing instructions as an explicit
migration exception. Runtime settings and the user's existing notification-hook changes are
preserved. OpenCode reviewers can write their report directories without blanket edit access.

New ventures include self-contained shared definitions and native files. Framework sync copies
the new sources, preflights target conflicts, and regenerates native files. Invalid requested
refs now fail before copying. Existing local runtime settings remain venture-owned.

Validation: seven offline adapter tests passed and cover mode isolation, equivalent prompts, repeat rendering,
drift detection, conflict refusal, symlink refusal, settings/custom-agent preservation, and
standalone scaffolding in paths with spaces. Shell syntax and generated configuration parsing
passed separately: 19 Codex TOML files and 32 Claude/OpenCode YAML headers parsed; all
shell scripts passed syntax checks. Installed 52 generated native files and checked them
for drift. All six original product-role definitions are byte-for-byte unchanged. No live
model calls or remote framework sync have been run.

Independent review initially requested artifact-only BRAND review and sync preflight before
source copying. Both fixes were implemented and independently re-reviewed with a PASS verdict.

Remaining work: live harness smoke tests; product-role consolidation only if requested;
Paseo integration; worker lease, checkpoint, and force-push enforcement hardening. Existing
PRD filename case inconsistencies are not a product-artifact migration in this change.
