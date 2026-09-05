#!/usr/bin/env bash
# PreToolUse hook (Bash matcher): blocks any `git push` invocation containing a
# force flag, regardless of where the flag appears in the command string.
#
# Why a hook and not just a permission-rule deny list: Claude Code's permission
# rules only support prefix-wildcard matching (e.g. "Bash(git push --force*)"
# matches strings STARTING WITH that text). That can't catch
# `git push origin main --force` (flag after the branch name), which a broad
# `"Bash(git push origin *)"` allow rule would otherwise let through. This hook
# inspects the full command string with a real regex instead, so flag position
# doesn't matter.
set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

if [ -z "$cmd" ]; then
  echo '{}'
  exit 0
fi

if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push' \
  && printf '%s' "$cmd" | grep -Eq -- '(--force([^-[:alnum:]]|$)|--force-with-lease|(^|[[:space:]])-f([[:space:]]|$))'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Force push is never allowed autonomously (git push --force/-f detected). If this is genuinely needed, a human must run it manually."}}'
else
  echo '{}'
fi
