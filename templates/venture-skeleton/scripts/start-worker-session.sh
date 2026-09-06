#!/usr/bin/env bash
# Starts an interactive agent CLI (Claude Code or OpenCode) inside a tmux session, so it
# survives you disconnecting (e.g. closing the phone SSH app over Tailscale) and
# reattaching later. Wraps the session with the Distributed Worker Protocol's lease
# (see AGENTS.md) so this machine doesn't collide with another one working the same repo,
# and sends a Telegram notification whenever the session ends for any reason.
#
# Usage:
#   scripts/start-worker-session.sh <claude|opencode> [--skip-permissions]
#
#   --skip-permissions  Claude only. Passes --dangerously-skip-permissions through to the
#                        claude CLI, bypassing ALL of its permission checks -- including,
#                        as far as we've verified, the deny-force-push.sh hook and the
#                        git-push allow/deny rules in .claude/settings.json. Claude's own
#                        --help text recommends this flag "only for sandboxes with no
#                        internet access" -- this machine has full internet access and
#                        real push credentials, so this is a deliberate, session-by-session
#                        opt-in, never the default. Not supported for opencode (it has its
#                        own separate permission.bash config, not this flag).
#
# Then, from anywhere (including your phone over Tailscale SSH):
#   tmux attach -t venture-worker
#
# To detach without ending the session: Ctrl-b, then d.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="${1:-}"
FLAG="${2:-}"
SESSION="venture-worker"
SKIP_PERMISSIONS=0

if [ "$CLI" != "claude" ] && [ "$CLI" != "opencode" ]; then
  echo "usage: start-worker-session.sh <claude|opencode> [--skip-permissions]" >&2
  exit 1
fi

if [ -n "$FLAG" ]; then
  if [ "$FLAG" != "--skip-permissions" ]; then
    echo "usage: start-worker-session.sh <claude|opencode> [--skip-permissions]" >&2
    exit 1
  fi
  if [ "$CLI" != "claude" ]; then
    echo "error: --skip-permissions is only supported for claude, not opencode." >&2
    exit 1
  fi
  SKIP_PERMISSIONS=1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "A '$SESSION' tmux session already exists. Attach instead:" >&2
  echo "  tmux attach -t $SESSION" >&2
  exit 1
fi

if ! "$REPO_ROOT/scripts/auto-checkpoint.sh"; then
  echo "error: auto-checkpoint.sh could not commit/push a dirty working tree. Resolve" >&2
  echo "that first -- see its output above." >&2
  exit 1
fi

echo "==> Syncing with origin before starting ..."
if ! "$REPO_ROOT/scripts/sync-from-github.sh"; then
  echo "error: sync-from-github.sh reported a problem (diverged history, or unpushed" >&2
  echo "local commits it couldn't reconcile). Resolve that first -- see its output above." >&2
  exit 1
fi

echo "==> Claiming Active Worker lease ..."
"$REPO_ROOT/scripts/worker-lease.sh" claim

if [ "$SKIP_PERMISSIONS" -eq 1 ]; then
  echo "==========================================================================" >&2
  echo "WARNING: starting claude with --dangerously-skip-permissions." >&2
  echo "This bypasses ALL of claude's permission checks for this session, including" >&2
  echo "(as far as we've verified) the force-push-deny hook and git-push allow/deny" >&2
  echo "rules. Claude's own docs recommend this only for sandboxes with no internet" >&2
  echo "access -- this machine has real push credentials to a live repo." >&2
  echo "==========================================================================" >&2
fi

echo "==> Starting tmux session '$SESSION' running '$CLI' ..."
tmux new-session -d -s "$SESSION" -c "$REPO_ROOT" \
  "bash '$REPO_ROOT/scripts/_run-worker-inner.sh' '$CLI' '$SKIP_PERMISSIONS'"

echo "Started. Attach with:"
echo "  tmux attach -t $SESSION"
