#!/usr/bin/env bash
# Safety-checked sync with the remote, per AGENTS.md's "Distributed Worker Protocol".
#
# Run this before starting autonomous work when this repository may be worked on from
# more than one machine. It never discards local work: a dirty tree, diverged history, or
# unpushed local commits all stop with a clear signal instead of resetting anything.
#
# Usage:
#   scripts/sync-from-github.sh
#
# Exit codes (also printed as a one-word status line):
#   0  UP_TO_DATE      or  SYNCED (fast-forwarded cleanly)
#   2  LOCAL_CHANGES   working tree is dirty -- refused to touch it
#   3  LOCAL_AHEAD     local commits exist that were never pushed
#   4  DIVERGED        local and remote history diverged -- needs a human

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "NOT_A_GIT_REPO"
  echo "This directory is not a git repository: $ROOT"
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [ -z "$BRANCH" ]; then
  echo "DETACHED_HEAD"
  echo "Not on a branch. Refusing to sync."
  exit 1
fi

echo "Project: $ROOT"
echo "Branch:  $BRANCH"

# Never overwrite local agent work, committed or not.
if [ -n "$(git status --porcelain)" ]; then
  echo "LOCAL_CHANGES"
  echo "Working tree is not clean. Commit or stash before syncing."
  exit 2
fi

git fetch origin "$BRANCH" --quiet

if ! git rev-parse --verify --quiet "origin/$BRANCH" >/dev/null; then
  echo "NO_REMOTE_BRANCH"
  echo "origin/$BRANCH does not exist yet. Nothing to sync against."
  exit 0
fi

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "UP_TO_DATE"
  exit 0
fi

BASE="$(git merge-base HEAD "origin/$BRANCH")"

if [ "$LOCAL" = "$BASE" ]; then
  echo "REMOTE_AHEAD"
  git pull --ff-only origin "$BRANCH"
  echo "SYNCED"
  exit 0
fi

if [ "$REMOTE" = "$BASE" ]; then
  echo "LOCAL_AHEAD"
  echo "Local commits exist that were never pushed to origin/$BRANCH."
  echo "Push them (a plain, non-force 'git push origin $BRANCH') before starting new"
  echo "autonomous work, so other workers can see this checkpoint."
  exit 3
fi

echo "DIVERGED"
echo "Local and remote history have diverged. This needs human review -- do not"
echo "merge, rebase, reset, or discard automatically."
exit 4
