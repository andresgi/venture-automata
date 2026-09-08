# Framework changes

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
