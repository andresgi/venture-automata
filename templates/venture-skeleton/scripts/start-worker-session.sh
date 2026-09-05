#!/usr/bin/env bash
# Starts an interactive agent CLI (Claude Code or OpenCode) inside a tmux session, so it
# survives you disconnecting (e.g. closing the phone SSH app over Tailscale) and
# reattaching later. Wraps the session with the Distributed Worker Protocol's lease
# (see AGENTS.md) so this machine doesn't collide with another one working the same repo,
# and sends a Telegram notification whenever the session ends for any reason.
#
# Usage:
#   scripts/start-worker-session.sh <claude|opencode>
#
# Then, from anywhere (including your phone over Tailscale SSH):
#   tmux attach -t venture-worker
#
# To detach without ending the session: Ctrl-b, then d.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="${1:-}"
SESSION="venture-worker"

if [ "$CLI" != "claude" ] && [ "$CLI" != "opencode" ]; then
  echo "usage: start-worker-session.sh <claude|opencode>" >&2
  exit 1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "A '$SESSION' tmux session already exists. Attach instead:" >&2
  echo "  tmux attach -t $SESSION" >&2
  exit 1
fi

echo "==> Syncing with origin before starting ..."
if ! "$REPO_ROOT/scripts/sync-from-github.sh"; then
  echo "error: sync-from-github.sh reported a problem (dirty tree, diverged history, or" >&2
  echo "unpushed local commits). Resolve that first -- see its output above." >&2
  exit 1
fi

echo "==> Claiming Active Worker lease ..."
"$REPO_ROOT/scripts/worker-lease.sh" claim

echo "==> Starting tmux session '$SESSION' running '$CLI' ..."
tmux new-session -d -s "$SESSION" -c "$REPO_ROOT" \
  "bash '$REPO_ROOT/scripts/_run-worker-inner.sh' '$CLI'"

echo "Started. Attach with:"
echo "  tmux attach -t $SESSION"
