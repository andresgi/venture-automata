#!/usr/bin/env bash
# Commits any dirty working tree as a WIP checkpoint before starting a worker session, and
# stamps a resumption note into agent/STATE.md so a later "continue" knows to pick the
# interrupted story back up. Exists because Claude's CLI does not exit when it hits a usage
# limit mid-session -- the process just sits there blocked, so there is no exit event to
# hook an auto-checkpoint into. This runs at worker-session START instead, so leftover
# dirty state from an interrupted previous session never blocks sync-from-github.sh's
# safety check and is never silently lost or left for you to commit by hand.
#
# Never destructive: only ever adds commits, never discards or resets anything. A no-op if
# the tree is already clean. Pushes what it commits (non-force) so a subsequent
# sync-from-github.sh call sees a clean, up-to-date state rather than failing on
# LOCAL_AHEAD immediately after this "fixed" the dirty-tree problem.
#
# Usage:
#   scripts/auto-checkpoint.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -z "$(git status --porcelain)" ]; then
  exit 0
fi

WORKER_ID="$(hostname -s 2>/dev/null || hostname)"
BRANCH="$(git branch --show-current)"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ -z "$BRANCH" ]; then
  echo "error: detached HEAD -- refusing to auto-checkpoint. Resolve manually." >&2
  exit 1
fi

echo "==> Working tree is dirty. Committing as a WIP auto-checkpoint (nothing is being discarded) ..."
git add -A
git commit -m "wip: auto-checkpoint before starting worker session (${WORKER_ID})" --quiet
SHA="$(git rev-parse --short HEAD)"
echo "==> Checkpointed as ${SHA} on ${BRANCH}."

if [ -f agent/STATE.md ]; then
  python3 - "$BRANCH" "$WORKER_ID" "$SHA" "$TIMESTAMP" <<'PYEOF'
import sys

branch, worker, sha, timestamp = sys.argv[1:5]
path = "agent/STATE.md"
marker = "## Current Work\n"

with open(path) as fh:
    text = fh.read()

if marker not in text:
    sys.exit(0)

note = (
    f"\n**Auto-checkpoint note:** a session on `{branch}` by `{worker}` left uncommitted "
    f"changes behind (most likely a usage-limit interruption -- Claude's CLI does not "
    f"exit when that happens, so nothing else caught it). Committed as `{sha}` at "
    f"{timestamp} before starting a new session. Verify what's actually done vs still "
    f"needed on this story before continuing.\n"
)

idx = text.index(marker) + len(marker)
text = text[:idx] + note + text[idx:]

with open(path, "w") as fh:
    fh.write(text)
PYEOF
  if ! git diff --quiet -- agent/STATE.md; then
    git add agent/STATE.md
    git commit -m "chore: note auto-checkpoint interruption in STATE.md (${SHA})" --quiet
    echo "==> Noted the interruption in agent/STATE.md's Current Work section."
  fi
fi

echo "==> Pushing checkpoint to origin/${BRANCH} ..."
if ! git push -u origin "$BRANCH"; then
  echo "error: push failed. The checkpoint is committed locally but NOT visible to any" >&2
  echo "other machine yet. Resolve the push manually before starting a worker session." >&2
  exit 1
fi
