#!/usr/bin/env bash
# Reports whether the configured Android emulator is connected and fully booted.
set -euo pipefail
: "${ANDROID_DEVICE_ID:=emulator-5554}"
if ! command -v adb >/dev/null 2>&1; then echo "adb is required but was not found in PATH." >&2; exit 2; fi
if ! adb -s "$ANDROID_DEVICE_ID" get-state 2>/dev/null | grep -qx 'device'; then echo "Android device '$ANDROID_DEVICE_ID' is not connected." >&2; exit 1; fi
BOOTED="$(adb -s "$ANDROID_DEVICE_ID" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
if [[ "$BOOTED" != "1" ]]; then echo "Android device '$ANDROID_DEVICE_ID' is connected but has not completed boot." >&2; exit 1; fi
API_LEVEL="$(adb -s "$ANDROID_DEVICE_ID" shell getprop ro.build.version.sdk 2>/dev/null | tr -d '\r')"
MODEL="$(adb -s "$ANDROID_DEVICE_ID" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
echo "Android device ready: $ANDROID_DEVICE_ID (${MODEL:-unknown}, API ${API_LEVEL:-unknown})"
