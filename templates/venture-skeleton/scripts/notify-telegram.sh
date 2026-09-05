#!/usr/bin/env bash
# Sends a Telegram message via the Bot API. Silently does nothing if not configured --
# this is a best-effort notification, never a blocking dependency for worker scripts.
#
# Config (never committed): set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID as environment
# variables, or put them in a gitignored .env.telegram file in the repo root:
#   TELEGRAM_BOT_TOKEN=123456:ABC-...
#   TELEGRAM_CHAT_ID=123456789
#
# Usage:
#   scripts/notify-telegram.sh "message text"

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$REPO_ROOT/.env.telegram" ]; then
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env.telegram"
fi

MESSAGE="${1:-}"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "notify-telegram: not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID unset) -- skipping" >&2
  exit 0
fi

if [ -z "$MESSAGE" ]; then
  echo "usage: notify-telegram.sh \"message\"" >&2
  exit 1
fi

curl -sS --max-time 10 \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MESSAGE}" \
  -o /dev/null \
  || echo "notify-telegram: send failed (non-fatal)" >&2

exit 0
