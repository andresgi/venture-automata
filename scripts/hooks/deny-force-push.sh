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
#
# Heredoc bodies (e.g. `git commit -m "$(cat <<'EOF' ... EOF)"`, used throughout
# this project's own commit convention) are stripped before scanning -- a commit
# message that merely *mentions* "git push --force" in prose must not trip this
# check. Only text outside heredoc bodies is treated as real shell command text.
set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)"

if [ -z "$cmd" ]; then
  echo '{}'
  exit 0
fi

stripped="$(printf '%s' "$cmd" | python3 -c '
import re
import sys

text = sys.stdin.read()
# Match <<EOF, <<"EOF", <<'"'"'EOF'"'"', <<-EOF (any quoting/dash-indent style),
# then remove everything up to the matching closing delimiter line.
pattern = re.compile(
    r"<<-?[\"\x27]?(\w+)[\"\x27]?.*?\n(?:.*?\n)*?\s*\1\s*(?=\n|$)",
    re.MULTILINE,
)
print(pattern.sub("", text))
')"

if printf '%s' "$stripped" | grep -Eq 'git[[:space:]]+push' \
  && printf '%s' "$stripped" | grep -Eq -- '(--force([^-[:alnum:]]|$)|--force-with-lease|(^|[[:space:]])-f([[:space:]]|$))'; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Force push is never allowed autonomously (git push --force/-f detected). If this is genuinely needed, a human must run it manually."}}'
else
  echo '{}'
fi
