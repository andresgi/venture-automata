#!/usr/bin/env bash
# Internal helper -- runs inside the tmux session started by start-worker-session.sh.
# Not meant to be invoked directly. Releases the Active Worker lease and sends a
# Telegram notification no matter how the CLI exits (normal quit, crash, killed session).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$1"
SKIP_PERMISSIONS="${2:-0}"
WORKER_ID="$(hostname -s 2>/dev/null || hostname)"

cleanup() {
  local exit_code=$?
  cd "$REPO_ROOT"
  "$REPO_ROOT/scripts/worker-lease.sh" release 2>&1 || true
  "$REPO_ROOT/scripts/notify-telegram.sh" \
    "Worker session on ${WORKER_ID} ended (${CLI}, exit ${exit_code}). Lease released." \
    2>&1 || true
}
trap cleanup EXIT

cd "$REPO_ROOT"
if [ "$CLI" = "claude" ] && [ "$SKIP_PERMISSIONS" = "1" ]; then
  claude --dangerously-skip-permissions
elif [ "$CLI" = "codex" ] && [ "$SKIP_PERMISSIONS" = "1" ]; then
  codex --dangerously-bypass-approvals-and-sandbox
else
  "$CLI"
fi
