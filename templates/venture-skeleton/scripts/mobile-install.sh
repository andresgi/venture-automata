#!/usr/bin/env bash
set -euo pipefail

: "${MOBILE_APK_PATH:?Set MOBILE_APK_PATH to the built APK path}"
if [[ ! -f "$MOBILE_APK_PATH" ]]; then
  echo "APK not found: $MOBILE_APK_PATH" >&2
  exit 2
fi

ADB=(adb)
ANDROID_DEVICE_ID="${ANDROID_DEVICE_ID:-emulator-5554}"
"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/mobile-emulator-status.sh"
ADB+=( -s "$ANDROID_DEVICE_ID" )
"${ADB[@]}" install -r "$MOBILE_APK_PATH"
