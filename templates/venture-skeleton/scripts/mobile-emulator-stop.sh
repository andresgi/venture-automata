#!/usr/bin/env bash
# Stops only the configured Android emulator serial. It refuses non-emulator serials.
set -euo pipefail
: "${ANDROID_DEVICE_ID:=emulator-5554}"
if [[ "$ANDROID_DEVICE_ID" != emulator-* ]]; then echo "Refusing to stop non-emulator device '$ANDROID_DEVICE_ID'." >&2; exit 2; fi
if ! command -v adb >/dev/null 2>&1; then echo "adb is required but was not found in PATH." >&2; exit 2; fi
adb -s "$ANDROID_DEVICE_ID" emu kill
