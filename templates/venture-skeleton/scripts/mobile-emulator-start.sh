#!/usr/bin/env bash
# Boots a named Android AVD without a graphical window and waits for ADB readiness.
set -euo pipefail
: "${ANDROID_AVD_NAME:?Set ANDROID_AVD_NAME to the pre-created Android Virtual Device name}"
: "${ANDROID_DEVICE_ID:=emulator-5554}"
: "${ANDROID_BOOT_TIMEOUT_SECONDS:=300}"
: "${ANDROID_EMULATOR_BIN:=emulator}"
: "${ANDROID_EMULATOR_LOG:=${TMPDIR:-/tmp}/android-emulator-${ANDROID_AVD_NAME}.log}"
if ! [[ "$ANDROID_BOOT_TIMEOUT_SECONDS" =~ ^[0-9]+$ ]] || [[ "$ANDROID_BOOT_TIMEOUT_SECONDS" -eq 0 ]]; then echo "ANDROID_BOOT_TIMEOUT_SECONDS must be a positive integer." >&2; exit 2; fi
if ! command -v "$ANDROID_EMULATOR_BIN" >/dev/null 2>&1 || ! command -v adb >/dev/null 2>&1; then echo "Android emulator and adb must both be available in PATH." >&2; exit 2; fi
if [[ ! -r /dev/kvm || ! -w /dev/kvm ]]; then echo "KVM access is required for a practical headless Android emulator; check /dev/kvm permissions." >&2; exit 2; fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if "$SCRIPT_DIR/mobile-emulator-status.sh" >/dev/null 2>&1; then echo "Android emulator '$ANDROID_DEVICE_ID' is already ready."; exit 0; fi
EXTRA_ARGS=()
if [[ -n "${ANDROID_EMULATOR_ARGS:-}" ]]; then read -r -a EXTRA_ARGS <<< "$ANDROID_EMULATOR_ARGS"; fi
echo "Starting headless AVD '$ANDROID_AVD_NAME' (log: $ANDROID_EMULATOR_LOG)"
nohup "$ANDROID_EMULATOR_BIN" "@${ANDROID_AVD_NAME}" -no-window -no-audio "${EXTRA_ARGS[@]}" >"$ANDROID_EMULATOR_LOG" 2>&1 &
DEADLINE=$(( $(date +%s) + ANDROID_BOOT_TIMEOUT_SECONDS ))
while (( $(date +%s) < DEADLINE )); do if "$SCRIPT_DIR/mobile-emulator-status.sh"; then exit 0; fi; sleep 5; done
echo "Android emulator '$ANDROID_DEVICE_ID' did not become ready within ${ANDROID_BOOT_TIMEOUT_SECONDS}s." >&2
echo "See emulator log: $ANDROID_EMULATOR_LOG" >&2
exit 1
