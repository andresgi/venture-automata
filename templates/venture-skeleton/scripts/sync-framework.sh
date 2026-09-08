#!/usr/bin/env bash
# Pulls the venture-automata orchestrator methodology (AGENTS.md, CLAUDE.md,
# agents/, adapters/, and native agent definitions) into this repo from a specific, pinned ref of the venture-automata
# GitHub repo -- deliberate and reviewable, never automatic.
# Run this whenever you want to pull in a framework improvement; the result is a plain
# git diff you review and commit like any other change, not a silent update.
#
# Every run stages scripts/sync-framework.sh.pending (see below) -- add that path to this
# repo's .gitignore if it isn't already, so it's never accidentally committed.
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
#   CLAUDE.md (generated)
#   agents/
#   adapters/ (templates and metadata; preserves local generated checksums)
#   .codex/agents/*.toml (generated)
#   scripts/render-adapters.py
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
#   scripts/watch-session-limit.sh
#   scripts/mobile-emulator-start.sh
#   scripts/mobile-emulator-status.sh
#   scripts/mobile-emulator-stop.sh
#
# What does NOT get copied: anything project-specific (config/, product/, engineering/,
# agent/ tracking files, app source, .claude/settings.json, opencode.jsonc). Both settings
# files are never overwritten here -- a venture's own permission/hook customizations must
# not be silently replaced. If they don't yet have the git-push allow rule and
# force-push-deny protection this framework expects (a Claude Code PreToolUse hook, or the
# equivalent per-agent `permission.bash` pattern for OpenCode subagents), add them by hand
# -- see templates/venture-skeleton/.claude/settings.json and this repo's own
# opencode.jsonc / .opencode/agents/*.md frontmatter for the reference shape -- rather
# than running this script against them. Same for the Claude Code `Notification` hook that
# forwards permission-needed / idle-waiting-on-you prompts to scripts/notify-telegram.sh --
# it's in templates/venture-skeleton/.claude/settings.json for new ventures to start with,
# but requires .env.telegram (or TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) to actually send
# anything, so add/remove it by hand per venture rather than expecting a sync to manage it.

set -euo pipefail

# Everything lives inside main(), called at the very bottom, so bash fully parses this
# function body before executing any of it. That was meant to make self-overwriting safe,
# but in testing it wasn't fully reliable either -- occasionally throwing a harmless-but-
# alarming trailing "unexpected EOF" after the real work had already completed
# successfully (exit 0), apparently from a final EOF-check read racing an in-place file
# replacement. Rather than keep chasing bash's exact read buffering behavior, this script
# now never overwrites its own live path at all while running: it writes any fetched
# update to sync-framework.sh.pending instead, and the *next* invocation -- a completely
# fresh bash process with nothing to race -- adopts it as its first action before doing
# anything else.
if [ -f "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sync-framework.sh.pending" ]; then
  PENDING="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sync-framework.sh.pending"
  LIVE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sync-framework.sh"
  echo "==> Adopting a framework update fetched by the previous run ..."
  mv "$PENDING" "$LIVE"
  chmod +x "$LIVE"
  exec "$LIVE" "$@"
fi

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

  # A missing ref must fail before copying any framework files.
  local RESOLVED_REF
  if ! RESOLVED_REF="$(cd "$TMP_DIR" && git rev-parse --verify "${REF}^{commit}" 2>/dev/null)"; then
    echo "error: requested framework ref '$REF' does not resolve to a commit" >&2
    exit 1
  fi
  (cd "$TMP_DIR" && git checkout --quiet "$RESOLVED_REF")

  # Refuse customized native outputs before touching any installed framework source.
  python3 "$TMP_DIR/scripts/render-adapters.py" --target "$REPO_ROOT" --preflight

  echo "==> Copying framework files into $REPO_ROOT ..."
  cp "$TMP_DIR/AGENTS.md" "$REPO_ROOT/AGENTS.md"
  mkdir -p "$REPO_ROOT/agents" "$REPO_ROOT/adapters" "$REPO_ROOT/scripts"
  cp "$TMP_DIR"/agents/*.md "$REPO_ROOT/agents/"
  for adapter in claude opencode codex; do
    mkdir -p "$REPO_ROOT/adapters/$adapter"
    cp -R "$TMP_DIR/adapters/$adapter/." "$REPO_ROOT/adapters/$adapter/"
  done
  cp "$TMP_DIR/adapters/roles.json" "$TMP_DIR/adapters/legacy-checksums.json" "$REPO_ROOT/adapters/"
  cp "$TMP_DIR/scripts/render-adapters.py" "$REPO_ROOT/scripts/"
  # Preserve the product roles as separate definitions during the scoped migration.
  mkdir -p "$REPO_ROOT/.claude/agents" "$REPO_ROOT/.opencode/agents"
  for role in product-researcher product-manager product-critic; do
    cp "$TMP_DIR/.claude/agents/$role.md" "$REPO_ROOT/.claude/agents/"
    cp "$TMP_DIR/.opencode/agents/$role.md" "$REPO_ROOT/.opencode/agents/"
  done
  python3 "$REPO_ROOT/scripts/render-adapters.py"

  mkdir -p "$REPO_ROOT/scripts/hooks"
  local SKELETON_SCRIPTS="$TMP_DIR/templates/venture-skeleton/scripts"
  if [ -d "$SKELETON_SCRIPTS" ]; then
    # Never overwrite the live sync-framework.sh while it's the one running -- see the
    # comment at the top of this file. Stage it as .pending; the next invocation adopts it.
    cp "$SKELETON_SCRIPTS/sync-framework.sh" "$REPO_ROOT/scripts/sync-framework.sh.pending"
    cp "$SKELETON_SCRIPTS/sync-from-github.sh" "$REPO_ROOT/scripts/sync-from-github.sh"
    cp "$SKELETON_SCRIPTS/hooks/deny-force-push.sh" "$REPO_ROOT/scripts/hooks/deny-force-push.sh"
    cp "$SKELETON_SCRIPTS/worker-lease.sh" "$REPO_ROOT/scripts/worker-lease.sh"
    cp "$SKELETON_SCRIPTS/notify-telegram.sh" "$REPO_ROOT/scripts/notify-telegram.sh"
    cp "$SKELETON_SCRIPTS/start-worker-session.sh" "$REPO_ROOT/scripts/start-worker-session.sh"
    cp "$SKELETON_SCRIPTS/_run-worker-inner.sh" "$REPO_ROOT/scripts/_run-worker-inner.sh"
    cp "$SKELETON_SCRIPTS/claim-for-session.sh" "$REPO_ROOT/scripts/claim-for-session.sh"
    cp "$SKELETON_SCRIPTS/auto-checkpoint.sh" "$REPO_ROOT/scripts/auto-checkpoint.sh"
    cp "$SKELETON_SCRIPTS/watch-session-limit.sh" "$REPO_ROOT/scripts/watch-session-limit.sh"
    cp "$SKELETON_SCRIPTS/mobile-emulator-start.sh" "$REPO_ROOT/scripts/mobile-emulator-start.sh"
    cp "$SKELETON_SCRIPTS/mobile-emulator-status.sh" "$REPO_ROOT/scripts/mobile-emulator-status.sh"
    cp "$SKELETON_SCRIPTS/mobile-emulator-stop.sh" "$REPO_ROOT/scripts/mobile-emulator-stop.sh"
    chmod +x \
      "$REPO_ROOT/scripts/sync-framework.sh.pending" \
      "$REPO_ROOT/scripts/sync-from-github.sh" \
      "$REPO_ROOT/scripts/hooks/deny-force-push.sh" \
      "$REPO_ROOT/scripts/worker-lease.sh" \
      "$REPO_ROOT/scripts/notify-telegram.sh" \
      "$REPO_ROOT/scripts/start-worker-session.sh" \
      "$REPO_ROOT/scripts/_run-worker-inner.sh" \
      "$REPO_ROOT/scripts/claim-for-session.sh" \
      "$REPO_ROOT/scripts/auto-checkpoint.sh" \
      "$REPO_ROOT/scripts/watch-session-limit.sh" \
      "$REPO_ROOT/scripts/mobile-emulator-start.sh" \
      "$REPO_ROOT/scripts/mobile-emulator-status.sh" \
      "$REPO_ROOT/scripts/mobile-emulator-stop.sh"
  fi

  local RESOLVED_SHA
  RESOLVED_SHA="$(cd "$TMP_DIR" && git rev-parse HEAD)"
  echo "==> Done. Synced from venture-automata@${REF} (${RESOLVED_SHA})."
  echo "==> Note: sync-framework.sh itself will update on the NEXT run of this script"
  echo "    (staged as sync-framework.sh.pending -- never overwrites its own live file"
  echo "    while running). Everything else above is already in place."
  echo "==> Review the diff (git status / git diff) and commit if it looks right, e.g.:"
  echo "    git add AGENTS.md CLAUDE.md agents adapters .claude/agents .opencode/agents .codex/agents scripts"
  echo "    git commit -m \"chore: sync framework from venture-automata@${RESOLVED_SHA:0:7}\""
}

main "$@"
