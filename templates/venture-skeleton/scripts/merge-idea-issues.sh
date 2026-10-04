#!/usr/bin/env bash
# Merges open GitHub issues labeled "idea" into agent/BACKLOG.md, then closes them.
#
# This is the merge half of the Telegram idea-inbox flow (see AGENTS.md, "Distributed
# Worker Protocol" and scripts/telegram-idea-poll.sh). Called from sync-from-github.sh
# after a clean sync, so whichever worker starts a session next is the one that picks up
# ideas captured while no machine was active. Best-effort: never fails the calling sync.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if ! command -v gh >/dev/null 2>&1; then
  exit 0
fi

ISSUES_JSON="$(gh issue list --label idea --state open --json number,title,body,url 2>/dev/null)" || exit 0

if [ -z "$ISSUES_JSON" ] || [ "$ISSUES_JSON" = "[]" ]; then
  exit 0
fi

COUNT="$(echo "$ISSUES_JSON" | jq 'length')"
echo "merge-idea-issues: found $COUNT open idea issue(s)"

for row in $(echo "$ISSUES_JSON" | jq -r 'keys[]'); do
  NUMBER="$(echo "$ISSUES_JSON" | jq -r ".[$row].number")"
  TITLE="$(echo "$ISSUES_JSON" | jq -r ".[$row].title")"
  BODY="$(echo "$ISSUES_JSON" | jq -r ".[$row].body")"
  URL="$(echo "$ISSUES_JSON" | jq -r ".[$row].url")"
  DATE="$(date +%Y-%m-%d)"

  {
    echo ""
    echo "- [ ] **$TITLE** (captured $DATE, $URL)"
    if [ -n "$BODY" ] && [ "$BODY" != "$TITLE" ]; then
      echo "  $BODY"
    fi
  } >> agent/BACKLOG.md

  gh issue close "$NUMBER" --comment "Merged into agent/BACKLOG.md" >/dev/null 2>&1 || true
done

if [ -n "$(git status --porcelain agent/BACKLOG.md)" ]; then
  git add agent/BACKLOG.md
  git commit -m "chore: merge $COUNT captured idea(s) into backlog" --quiet
  git push --quiet
  echo "merge-idea-issues: merged and pushed $COUNT idea(s)"
fi
