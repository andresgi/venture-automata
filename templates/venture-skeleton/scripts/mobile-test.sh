#!/usr/bin/env bash
set -euo pipefail

FLOW="${1:-maestro/smoke.yaml}"
if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI is required. Install it and configure the Maestro MCP server." >&2
  exit 2
fi
if [[ ! -f "$FLOW" ]]; then
  echo "Maestro flow not found: $FLOW" >&2
  exit 2
fi

MAESTRO=(maestro)
if [[ -n "${ANDROID_DEVICE_ID:-}" ]]; then
  MAESTRO+=( --device "$ANDROID_DEVICE_ID" )
fi
"${MAESTRO[@]}" test "$FLOW"
