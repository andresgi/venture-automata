#!/usr/bin/env bash
set -euo pipefail

: "${MOBILE_APK_PATH:?Set MOBILE_APK_PATH to the built APK path}"
if [[ ! -f "$MOBILE_APK_PATH" ]]; then
  echo "APK not found: $MOBILE_APK_PATH" >&2
  exit 2
fi

ADB=(adb)
if [[ -n "${ANDROID_DEVICE_ID:-}" ]]; then
  ADB+=( -s "$ANDROID_DEVICE_ID" )
fi
"${ADB[@]}" install -r "$MOBILE_APK_PATH"
