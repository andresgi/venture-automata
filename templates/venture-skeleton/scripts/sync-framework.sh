#!/usr/bin/env bash
# Pulls the venture-automata orchestrator methodology (AGENTS.md, CLAUDE.md,
# .claude/agents/*) into this repo from a specific, pinned ref of the venture-automata
# GitHub repo -- deliberate and reviewable, never automatic. This repo was extracted
# from venture-automata via `git subtree split` (full history preserved) so that
# nanamex's CI/CD and deployment are fully independent of ongoing framework changes.
# Run this whenever you want to pull in a framework improvement; the result is a plain
# git diff you review and commit like any other change, not a silent update.
#
# Usage:
#   scripts/sync-framework.sh [ref]
#
#   ref  A branch, tag, or commit SHA in andresgi/venture-automata. Defaults to "main".
#        Prefer pinning to a tag or commit once venture-automata starts tagging
#        releases, so updates here are intentional version bumps, not "whatever main
#        happens to be today."
#
# What gets copied (overwritten in place):
#   AGENTS.md
#   CLAUDE.md
#   .claude/agents/*.md
#   .opencode/agents/*.md
#   scripts/sync-framework.sh (this script itself)
#   scripts/sync-from-github.sh
#   scripts/hooks/deny-force-push.sh
#   scripts/worker-lease.sh
#   scripts/notify-telegram.sh
#   scripts/start-worker-session.sh
#   scripts/_run-worker-inner.sh
#   scripts/claim-for-session.sh
#   scripts/auto-checkpoint.sh
#
# What does NOT get copied: anything project-specific (config/, product/, engineering/,
# agent/ tracking files, app source, .claude/settings.json, opencode.jsonc). Both settings
# files are never overwritten here -- a venture's own permission/hook customizations must
# not be silently replaced. If they don't yet have the git-push allow rule and
# force-push-deny protection this framework expects (a Claude Code PreToolUse hook, or the
# equivalent per-agent `permission.bash` pattern for OpenCode subagents), add them by hand
# -- see templates/venture-skeleton/.claude/settings.json and this repo's own
# opencode.jsonc / .opencode/agents/*.md frontmatter for the reference shape -- rather
# than running this script against them.

set -euo pipefail

# Everything lives inside main(), called at the very bottom. This is the standard pattern
# for a script that overwrites its own file while running: bash must fully parse a
# function body before executing any of it, so once main() starts, replacing the on-disk
# file has zero effect on this already-running process. A bare temp-file-then-rename on
# its own was NOT sufficient here in testing -- this bash build still re-reads the script
# from disk in blocks during execution, and desynced mid-parse even with an atomic rename.
main() {
  local REF="${1:-main}"
  local SOURCE_REPO="https://github.com/andresgi/venture-automata.git"
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  # Not `local` -- the EXIT trap fires after main() returns, when a local's scope has
  # already ended, which would make $TMP_DIR unbound under `set -u` at cleanup time.
  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  echo "==> Fetching venture-automata@${REF} ..."
  git clone --quiet --depth 1 --branch "$REF" "$SOURCE_REPO" "$TMP_DIR" 2>/dev/null \
    || git clone --quiet "$SOURCE_REPO" "$TMP_DIR"

  if [ ! -d "$TMP_DIR/.git" ]; then
    echo "error: clone of $SOURCE_REPO failed" >&2
    exit 1
  fi

  # The --branch fetch above only works for actual branch/tag names; if $REF is a raw
  # commit SHA, fall back to checking it out explicitly in the full clone.
  if [ -n "$(cd "$TMP_DIR" && git rev-parse --verify --quiet "$REF" 2>/dev/null || true)" ]; then
    (cd "$TMP_DIR" && git checkout --quiet "$REF")
  fi

  echo "==> Copying framework files into $REPO_ROOT ..."
  cp "$TMP_DIR/AGENTS.md" "$REPO_ROOT/AGENTS.md"
  cp "$TMP_DIR/CLAUDE.md" "$REPO_ROOT/CLAUDE.md"
  mkdir -p "$REPO_ROOT/.claude/agents"
  rm -f "$REPO_ROOT"/.claude/agents/*.md
  cp "$TMP_DIR"/.claude/agents/*.md "$REPO_ROOT/.claude/agents/"

  if [ -d "$TMP_DIR/.opencode/agents" ]; then
    mkdir -p "$REPO_ROOT/.opencode/agents"
    rm -f "$REPO_ROOT"/.opencode/agents/*.md
    cp "$TMP_DIR"/.opencode/agents/*.md "$REPO_ROOT/.opencode/agents/"
  fi

  mkdir -p "$REPO_ROOT/scripts/hooks"
  local SKELETON_SCRIPTS="$TMP_DIR/templates/venture-skeleton/scripts"
  if [ -d "$SKELETON_SCRIPTS" ]; then
    cp "$SKELETON_SCRIPTS/sync-framework.sh" "$REPO_ROOT/scripts/sync-framework.sh"
    cp "$SKELETON_SCRIPTS/sync-from-github.sh" "$REPO_ROOT/scripts/sync-from-github.sh"
    cp "$SKELETON_SCRIPTS/hooks/deny-force-push.sh" "$REPO_ROOT/scripts/hooks/deny-force-push.sh"
    cp "$SKELETON_SCRIPTS/worker-lease.sh" "$REPO_ROOT/scripts/worker-lease.sh"
    cp "$SKELETON_SCRIPTS/notify-telegram.sh" "$REPO_ROOT/scripts/notify-telegram.sh"
    cp "$SKELETON_SCRIPTS/start-worker-session.sh" "$REPO_ROOT/scripts/start-worker-session.sh"
    cp "$SKELETON_SCRIPTS/_run-worker-inner.sh" "$REPO_ROOT/scripts/_run-worker-inner.sh"
    cp "$SKELETON_SCRIPTS/claim-for-session.sh" "$REPO_ROOT/scripts/claim-for-session.sh"
    cp "$SKELETON_SCRIPTS/auto-checkpoint.sh" "$REPO_ROOT/scripts/auto-checkpoint.sh"
    chmod +x \
      "$REPO_ROOT/scripts/sync-framework.sh" \
      "$REPO_ROOT/scripts/sync-from-github.sh" \
      "$REPO_ROOT/scripts/hooks/deny-force-push.sh" \
      "$REPO_ROOT/scripts/worker-lease.sh" \
      "$REPO_ROOT/scripts/notify-telegram.sh" \
      "$REPO_ROOT/scripts/start-worker-session.sh" \
      "$REPO_ROOT/scripts/_run-worker-inner.sh" \
      "$REPO_ROOT/scripts/claim-for-session.sh" \
      "$REPO_ROOT/scripts/auto-checkpoint.sh"
  fi

  local RESOLVED_SHA
  RESOLVED_SHA="$(cd "$TMP_DIR" && git rev-parse HEAD)"
  echo "==> Done. Synced from venture-automata@${REF} (${RESOLVED_SHA})."
  echo "==> Review the diff (git status / git diff) and commit if it looks right, e.g.:"
  echo "    git add AGENTS.md CLAUDE.md .claude/agents .opencode/agents scripts"
  echo "    git commit -m \"chore: sync framework from venture-automata@${RESOLVED_SHA:0:7}\""
}

main "$@"
