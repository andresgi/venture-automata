#!/usr/bin/env bash
# Central Telegram idea-inbox poller for multiple venture repos sharing one bot.
#
# A single bot's getUpdates offset is shared across every consumer, so having each
# venture repo poll independently races them against each other -- whichever repo's
# workflow polls first silently consumes the message for everyone else. This script is
# the one and only poller: it runs from this framework repo, and routes each message to
# the correct venture repo by a leading "#tag" you type, per config/telegram-routes.conf.
#
# Message format:
#   #tag the idea text
#
# Config (never committed): set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as environment
# variables, or put them in a gitignored .env.telegram file in the repo root. Also
# requires a token with write access to every mapped venture repo -- the default
# per-workflow GITHUB_TOKEN only has access to this repo, so GH_TOKEN must be set to a
# personal access token (repo scope) covering all routes in config/telegram-routes.conf.
#
# State: the Telegram update offset is kept in agent/.telegram-router-offset (committed)
# so restarts don't replay old messages.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -f "$REPO_ROOT/.env.telegram" ]; then
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.telegram"
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "telegram-idea-router: not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID unset) -- skipping" >&2
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "telegram-idea-router: jq is required" >&2
  exit 1
fi

ROUTES_FILE="$REPO_ROOT/config/telegram-routes.conf"

route_for_tag() {
  local tag="$1"
  [ -f "$ROUTES_FILE" ] || return 1
  grep -v '^\s*#' "$ROUTES_FILE" | grep -v '^\s*$' | while IFS='=' read -r k v; do
    if [ "$k" = "$tag" ]; then
      echo "$v"
      return 0
    fi
  done
}

reply() {
  curl -sS --max-time 10 \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=$1" \
    -o /dev/null || true
}

OFFSET_FILE="$REPO_ROOT/agent/.telegram-router-offset"
mkdir -p "$REPO_ROOT/agent"
OFFSET="0"
if [ -f "$OFFSET_FILE" ]; then
  OFFSET="$(cat "$OFFSET_FILE")"
fi

RESPONSE="$(curl -sS --max-time 15 \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=0")"

if [ -z "$RESPONSE" ]; then
  echo "telegram-idea-router: empty response from Telegram" >&2
  exit 1
fi

ok="$(echo "$RESPONSE" | jq -r '.ok')"
if [ "$ok" != "true" ]; then
  echo "telegram-idea-router: Telegram API error: $RESPONSE" >&2
  exit 1
fi

COUNT="$(echo "$RESPONSE" | jq '.result | length')"
if [ "$COUNT" -eq 0 ]; then
  echo "telegram-idea-router: no new messages"
  exit 0
fi

MAX_UPDATE_ID="$OFFSET"

for row in $(echo "$RESPONSE" | jq -r '.result | keys[]'); do
  UPDATE_ID="$(echo "$RESPONSE" | jq -r ".result[$row].update_id")"
  CHAT_ID="$(echo "$RESPONSE" | jq -r ".result[$row].message.chat.id // empty")"
  TEXT="$(echo "$RESPONSE" | jq -r ".result[$row].message.text // empty")"

  if [ "$UPDATE_ID" -ge "$MAX_UPDATE_ID" ]; then
    MAX_UPDATE_ID=$((UPDATE_ID + 1))
  fi

  if [ -z "$CHAT_ID" ] || [ "$CHAT_ID" != "$TELEGRAM_CHAT_ID" ]; then
    echo "telegram-idea-router: ignoring message from untrusted chat $CHAT_ID" >&2
    continue
  fi

  if [ -z "$TEXT" ]; then
    continue
  fi

  if [[ ! "$TEXT" =~ ^#([a-z0-9-]+)[[:space:]]+(.+)$ ]]; then
    reply "Couldn't route that -- start the message with a project tag, e.g. '#invoice-pilot fix the login bug'."
    continue
  fi

  TAG="${BASH_REMATCH[1]}"
  BODY_TEXT="${BASH_REMATCH[2]}"

  TARGET_REPO="$(route_for_tag "$TAG")"
  if [ -z "$TARGET_REPO" ]; then
    reply "Unknown project tag '#${TAG}' -- check config/telegram-routes.conf."
    continue
  fi

  TITLE="$(echo "$BODY_TEXT" | head -n1 | cut -c1-80)"

  gh label create idea --repo "$TARGET_REPO" --color FBCA04 \
    --description "Captured via Telegram idea inbox" --force >/dev/null 2>&1 || true

  if gh issue create --repo "$TARGET_REPO" --title "$TITLE" --body "$BODY_TEXT" --label idea \
      >/tmp/telegram-idea-issue-url 2>/tmp/telegram-idea-issue-err; then
    ISSUE_URL="$(cat /tmp/telegram-idea-issue-url)"
    reply "Captured in ${TARGET_REPO}: ${ISSUE_URL}"
  else
    echo "telegram-idea-router: gh issue create failed for $TARGET_REPO: $(cat /tmp/telegram-idea-issue-err)" >&2
    reply "Failed to capture idea for '#${TAG}' -- check the router workflow logs."
  fi
done

echo "$MAX_UPDATE_ID" > "$OFFSET_FILE"
echo "telegram-idea-router: processed $COUNT update(s), offset now $MAX_UPDATE_ID"
