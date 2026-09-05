#!/usr/bin/env bash
# Claims or releases the Active Worker lease in agent/STATE.md (see AGENTS.md,
# "Distributed Worker Protocol"). This is a cooperative convention, not a hard lock --
# it only works if every worker checks it before starting and releases it when done.
#
# Usage:
#   scripts/worker-lease.sh claim     Claim the lease as this machine (hostname). Fails
#                                      if another machine currently holds it.
#   scripts/worker-lease.sh release   Release the lease back to "none". Fails if this
#                                      machine doesn't currently hold it (use --force to
#                                      override, e.g. cleaning up after a crash).
#   scripts/worker-lease.sh status    Print the current holder and exit 0.
#
# Each claim/release commits and pushes agent/STATE.md immediately -- an unpushed lease
# change is invisible to any other machine, so this script fails loudly rather than
# silently if the push doesn't succeed.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="$REPO_ROOT/agent/STATE.md"
WORKER_ID="$(hostname -s 2>/dev/null || hostname)"
ACTION="${1:-}"
FORCE="${2:-}"

if [ ! -f "$STATE_FILE" ]; then
  echo "error: $STATE_FILE not found" >&2
  exit 1
fi

current_holder() {
  grep -m1 '^Active Worker:' "$STATE_FILE" | sed 's/^Active Worker: *//'
}

set_holder() {
  local new_value="$1"
  # BSD sed (macOS) needs -i '', GNU sed (Linux, the home PC) needs -i without an arg.
  # Detect by trying GNU-style first; fall back to BSD-style on failure.
  if sed -i "s/^Active Worker:.*/Active Worker: ${new_value}/" "$STATE_FILE" 2>/dev/null; then
    :
  else
    sed -i '' "s/^Active Worker:.*/Active Worker: ${new_value}/" "$STATE_FILE"
  fi
}

commit_and_push() {
  local message="$1"
  (cd "$REPO_ROOT" && git add agent/STATE.md && git commit -m "$message" --quiet)
  local branch
  branch="$(cd "$REPO_ROOT" && git branch --show-current)"
  if ! (cd "$REPO_ROOT" && git push origin "$branch"); then
    echo "error: push failed -- lease change is LOCAL ONLY and invisible to other workers." >&2
    echo "Do not proceed until this is pushed (retry the push, or resolve manually)." >&2
    exit 1
  fi
}

case "$ACTION" in
  claim)
    holder="$(current_holder)"
    if [ "$holder" != "none" ] && [ "$holder" != "$WORKER_ID" ]; then
      echo "error: Active Worker is already '$holder' -- refusing to claim." >&2
      echo "Per AGENTS.md's Distributed Worker Protocol, treat this like a human gate:" >&2
      echo "stop, do not proceed, until it reads 'none'." >&2
      exit 1
    fi
    set_holder "$WORKER_ID"
    commit_and_push "chore: claim active worker lease ($WORKER_ID)"
    echo "Claimed Active Worker lease as '$WORKER_ID'."
    ;;
  release)
    holder="$(current_holder)"
    if [ "$holder" != "$WORKER_ID" ] && [ "$FORCE" != "--force" ]; then
      echo "error: Active Worker is '$holder', not this machine ('$WORKER_ID') -- refusing to release." >&2
      echo "Use 'scripts/worker-lease.sh release --force' only if you are certain '$holder' crashed" >&2
      echo "or was never cleanly released, e.g. cleaning up after a dead session." >&2
      exit 1
    fi
    if [ "$holder" = "none" ]; then
      echo "Lease already 'none' -- nothing to release."
      exit 0
    fi
    set_holder "none"
    commit_and_push "chore: release active worker lease (was $holder)"
    echo "Released Active Worker lease (was '$holder')."
    ;;
  status)
    echo "Active Worker: $(current_holder)"
    ;;
  *)
    echo "usage: worker-lease.sh <claim|release|status> [--force]" >&2
    exit 1
    ;;
esac
