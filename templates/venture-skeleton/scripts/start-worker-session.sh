#!/usr/bin/env bash
# Starts an interactive agent CLI (Claude Code, OpenCode, or Codex) inside a tmux session, so it
# survives you disconnecting (e.g. closing the phone SSH app over Tailscale) and
# reattaching later. Wraps the session with the Distributed Worker Protocol's lease
# (see AGENTS.md) so this machine doesn't collide with another one working the same repo,
# and sends a Telegram notification whenever the session ends for any reason.
#
# Usage:
#   scripts/start-worker-session.sh <claude|opencode|codex> [--skip-permissions]
#
#   --skip-permissions  Optional for Claude or Codex. For Claude, passes
#                        --dangerously-skip-permissions. For Codex, passes
#                        --dangerously-bypass-approvals-and-sandbox. Both bypass all
#                        command approvals; Codex also bypasses its sandbox. This is a
#                        deliberate, session-by-session opt-in, never the default.
#                        Not supported for OpenCode, which has its own permission.bash
#                        configuration.
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

if [ "$CLI" != "claude" ] && [ "$CLI" != "opencode" ] && [ "$CLI" != "codex" ]; then
  echo "usage: start-worker-session.sh <claude|opencode|codex> [--skip-permissions]" >&2
  exit 1
fi

if [ -n "$FLAG" ]; then
  if [ "$FLAG" != "--skip-permissions" ]; then
    echo "usage: start-worker-session.sh <claude|opencode|codex> [--skip-permissions]" >&2
    exit 1
  fi
  if [ "$CLI" != "claude" ] && [ "$CLI" != "codex" ]; then
    echo "error: --skip-permissions is only supported for claude or codex, not opencode." >&2
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
  if [ "$CLI" = "claude" ]; then
    echo "WARNING: starting claude with --dangerously-skip-permissions." >&2
    echo "This bypasses ALL of claude's permission checks for this session, including" >&2
    echo "(as far as we've verified) the force-push-deny hook and git-push allow/deny" >&2
    echo "rules. Claude's own docs recommend this only for sandboxes with no internet" >&2
    echo "access -- this machine has real push credentials to a live repo." >&2
  else
    echo "WARNING: starting codex with --dangerously-bypass-approvals-and-sandbox." >&2
    echo "This bypasses ALL Codex command approvals and its sandbox for this session." >&2
  fi
  echo "==========================================================================" >&2
fi

echo "==> Starting tmux session '$SESSION' running '$CLI' ..."
tmux new-session -d -s "$SESSION" -c "$REPO_ROOT" \
  "bash '$REPO_ROOT/scripts/_run-worker-inner.sh' '$CLI' '$SKIP_PERMISSIONS'"

if [ "${SESSION_WATCH_ENABLED:-1}" = "1" ] && [ -x "$REPO_ROOT/scripts/watch-session-limit.sh" ]; then
  nohup "$REPO_ROOT/scripts/watch-session-limit.sh" --cli "$CLI" --session "$SESSION" \
    >"${TMPDIR:-/tmp}/venture-session-watch-${SESSION}.log" 2>&1 &
  echo "==> Started session-limit watchdog (set SESSION_WATCH_ENABLED=0 to disable)."
fi

echo "Started. Attach with:"
echo "  tmux attach -t $SESSION"
