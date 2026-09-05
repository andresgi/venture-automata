#!/usr/bin/env bash
# Syncs with origin, then claims the Active Worker lease -- both in one step. For use
# before starting a real work session against a long-running process that doesn't have
# its own start/exit boundary to hook a sync into (e.g. `opencode web`, left running for
# days). Unlike start-worker-session.sh, this does not start or stop a CLI itself, and
# does not auto-release the lease -- release it yourself with worker-lease.sh when you're
# done with that session.
#
# Usage:
#   scripts/claim-for-session.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Syncing with origin ..."
if ! "$REPO_ROOT/scripts/sync-from-github.sh"; then
  echo "error: sync-from-github.sh reported a problem (dirty tree, diverged history, or" >&2
  echo "unpushed local commits). Resolve that first -- see its output above -- before" >&2
  echo "claiming the lease and starting work." >&2
  exit 1
fi

echo "==> Claiming Active Worker lease ..."
"$REPO_ROOT/scripts/worker-lease.sh" claim

echo "==> Ready. Remember to run 'scripts/worker-lease.sh release' when you're done."
