#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${MOBILE_BUILD_COMMAND:-}" ]]; then
  echo "MOBILE_BUILD_COMMAND is required (set the Android debug build command)." >&2
  exit 2
fi

echo "Building Android app"
bash -lc "$MOBILE_BUILD_COMMAND"
