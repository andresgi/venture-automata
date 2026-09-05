#!/usr/bin/env bash
# Internal helper -- runs inside the tmux session started by start-worker-session.sh.
# Not meant to be invoked directly. Releases the Active Worker lease and sends a
# Telegram notification no matter how the CLI exits (normal quit, crash, killed session).

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$1"
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
"$CLI"
