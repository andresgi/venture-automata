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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DEVICE_ID="${ANDROID_DEVICE_ID:-emulator-5554}"
"$SCRIPT_DIR/mobile-emulator-status.sh"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
ARTIFACT_DIR="${MOBILE_QA_ARTIFACT_DIR:-agent/qa/evidence/mobile/${RUN_ID}}"
mkdir -p "$ARTIFACT_DIR"

MAESTRO=(maestro --device "$ANDROID_DEVICE_ID")
"${MAESTRO[@]}" test --format JUNIT --output "$ARTIFACT_DIR/junit.xml" --debug-output "$ARTIFACT_DIR/debug" "$FLOW"
echo "Maestro evidence: $ARTIFACT_DIR"
