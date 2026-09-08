#!/usr/bin/env bash
# Watches a detached tmux worker pane for likely usage-limit or permission-request output,
# or a prolonged lack of terminal progress, then sends Telegram alerts. Permission matching
# is advisory for terminal clients; Claude Code uses its native notification hook instead.
# It is deliberately observational: it never sends input, kills/restarts a CLI, changes
# files, checkpoints work, or releases a worker lease.

set -uo pipefail

usage() {
  echo "usage: $0 --cli <claude|opencode|codex> --session <tmux-session> [--idle-seconds <seconds>]" >&2
  exit 1
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI=""
SESSION=""
IDLE_SECONDS="${SESSION_WATCH_IDLE_SECONDS:-1800}"
INTERVAL_SECONDS="${SESSION_WATCH_INTERVAL_SECONDS:-30}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli) CLI="${2:-}"; shift 2 ;;
    --session) SESSION="${2:-}"; shift 2 ;;
    --idle-seconds) IDLE_SECONDS="${2:-}"; shift 2 ;;
    *) usage ;;
  esac
done

[[ "$CLI" == "claude" || "$CLI" == "opencode" || "$CLI" == "codex" ]] || usage
[[ -n "$SESSION" ]] || usage
[[ "$IDLE_SECONDS" =~ ^[0-9]+$ && "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || usage
[[ "$INTERVAL_SECONDS" -gt 0 ]] || usage

PATTERN_FILE="$REPO_ROOT/config/session-watch-patterns.conf"
PERMISSION_PATTERN_FILE="$REPO_ROOT/config/session-watch-permission-patterns.conf"
STATE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/venture-session-watch.XXXXXX")"
trap 'rm -rf "$STATE_DIR"' EXIT

send_alert() {
  "$REPO_ROOT/scripts/notify-telegram.sh" "$1" 2>&1 || true
}

matching_lines() {
  local pattern_file="$1"
  local pane="$2"
  local provider regex
  while IFS='|' read -r provider regex; do
    [[ -n "$provider" && "${provider:0:1}" != "#" && -n "$regex" ]] || continue
    [[ "$provider" == "all" || "$provider" == "$CLI" ]] || continue
    printf '%s\n' "$pane" | grep -E -i -- "$regex" || true
  done < <(pattern_lines "$pattern_file")
}

pattern_lines() {
  local pattern_file="$1"
  if [[ -f "$pattern_file" ]]; then
    cat "$pattern_file"
    return
  fi
  # Existing ventures may receive the script through framework sync before they add the
  # optional config file. Preserve useful detection without overwriting venture config.
  if [[ "$pattern_file" == "$PATTERN_FILE" ]]; then
    printf '%s\n' \
      'all|(usage|rate)[[:space:]-]*limit' \
      'all|quota[[:space:]].*(reached|exhausted)' \
      'all|(limit|quota).*(reached|exhausted)' \
      'all|try again[[:space:]].*(later|after)' \
      'all|resets?[[:space:]]+(at|in)'
  else
    printf '%s\n' \
      'opencode|(permission|approval)[[:space:]].*(required|needed|requested)' \
      'opencode|(allow|approve|reject).*(command|tool|permission)' \
      'codex|(permission|approval)[[:space:]].*(required|needed|requested)' \
      'codex|(allow|approve|deny).*(command|tool|permission)'
  fi
}

LIMIT_ALERTED=0
LAST_PERMISSION_SIGNATURE=""
IDLE_ALERTED=0
LAST_SIGNATURE=""
LAST_PROGRESS_AT="$(date +%s)"

while tmux has-session -t "$SESSION" 2>/dev/null; do
  PANE="$(tmux capture-pane -p -S -120 -t "$SESSION" 2>/dev/null || true)"
  NOW="$(date +%s)"
  SIGNATURE="$(printf '%s' "$PANE" | cksum)"

  if [[ "$SIGNATURE" != "$LAST_SIGNATURE" ]]; then
    LAST_SIGNATURE="$SIGNATURE"
    LAST_PROGRESS_AT="$NOW"
    IDLE_ALERTED=0
  fi

  LIMIT_LINES="$(matching_lines "$PATTERN_FILE" "$PANE")"
  if [[ "$LIMIT_ALERTED" -eq 0 && -n "$LIMIT_LINES" ]]; then
    send_alert "[$(basename "$REPO_ROOT")] Likely ${CLI} usage/session limit detected on $(hostname -s 2>/dev/null || hostname). Worker and lease were left unchanged. Reattach: tmux attach -t ${SESSION}"
    LIMIT_ALERTED=1
  fi

  PERMISSION_LINES="$(matching_lines "$PERMISSION_PATTERN_FILE" "$PANE")"
  PERMISSION_SIGNATURE="$(printf '%s' "$PERMISSION_LINES" | cksum)"
  if [[ -n "$PERMISSION_LINES" && "$PERMISSION_SIGNATURE" != "$LAST_PERMISSION_SIGNATURE" ]]; then
    send_alert "[$(basename "$REPO_ROOT")] ${CLI} appears to be waiting for permission on $(hostname -s 2>/dev/null || hostname). Review the exact request before approving. Reattach: tmux attach -t ${SESSION}"
    LAST_PERMISSION_SIGNATURE="$PERMISSION_SIGNATURE"
  fi

  if [[ "$LIMIT_ALERTED" -eq 0 && "$IDLE_ALERTED" -eq 0 && $((NOW - LAST_PROGRESS_AT)) -ge "$IDLE_SECONDS" ]]; then
    send_alert "[$(basename "$REPO_ROOT")] No terminal progress from ${CLI} worker on $(hostname -s 2>/dev/null || hostname) for ${IDLE_SECONDS}s. It may be waiting, stalled, or limit-blocked. Worker and lease were left unchanged. Reattach: tmux attach -t ${SESSION}"
    IDLE_ALERTED=1
  fi

  sleep "$INTERVAL_SECONDS"
done
