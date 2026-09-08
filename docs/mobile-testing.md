# Mobile testing with Maestro MCP

This framework supports optional agent-driven Android testing through Maestro's Model
Context Protocol (MCP). A venture opts in under `config/CONSTRAINTS.md`; mobile QA is
manual by default.

Install Maestro CLI, configure an Android Studio emulator, and verify:

```bash
maestro --version
maestro list-devices
```

## Headless Ubuntu runner

A screenless Ubuntu worker can be the dedicated Android QA runner. Create a named AVD once,
ensure the worker account can access `/dev/kvm`, and make `emulator` and `adb` available in
`PATH`. The framework starts it with Android's `-no-window` flag; Maestro then drives the
running device through ADB. Do not enable Maestro MCP in `config/CONSTRAINTS.md` until the
readiness checks below pass.

```bash
export ANDROID_AVD_NAME='Pixel_6_API_34'
export ANDROID_DEVICE_ID='emulator-5554'
./scripts/mobile-emulator-start.sh
./scripts/mobile-emulator-status.sh
./scripts/mobile-build.sh
./scripts/mobile-install.sh
./scripts/mobile-test.sh maestro/smoke.yaml
```

`mobile-emulator-start.sh` never installs packages or creates an AVD; it only boots the
named AVD headlessly and waits up to `ANDROID_BOOT_TIMEOUT_SECONDS` (300 by default).
`mobile-test.sh` writes JUnit and Maestro debug evidence to
`agent/qa/evidence/mobile/<UTC-run-id>/`. Stop the configured emulator explicitly with
`./scripts/mobile-emulator-stop.sh`; that script refuses non-emulator serials.

Required enablement evidence: the named AVD boots with `-no-window`, `adb devices` reports
the configured serial, the status script reports boot completion/API level, the app installs
and launches, and a smoke flow produces its evidence. Record the AVD, serial, API level,
build/commit, flow, and artifact path in the QA report.

Configure the harness MCP client to run:

```json
{"mcpServers":{"maestro":{"command":"maestro","args":["mcp"]}}}
```

Restart the harness after changing MCP configuration. Maestro exposes device management,
app launch, view-hierarchy inspection, flow execution, taps, and screenshots. The agent
still builds and installs the app using venture-specific commands.

For each run, record emulator ID, Android API level, app build or commit, flow/commands,
and screenshots or failure output. Use stable accessibility selectors and `clearState`
when isolation is required. Keep flows in the venture's documented mobile-test directory;
never commit credentials or real user data. Missing MCP, emulator, build, or device
capability means the affected checks are BLOCKED or UNVERIFIED.

## Venture starter kit

New ventures are scaffolded with `maestro/smoke.yaml` and these scripts:

```bash
./scripts/mobile-build.sh       # requires MOBILE_BUILD_COMMAND
./scripts/mobile-emulator-start.sh # requires ANDROID_AVD_NAME
./scripts/mobile-install.sh     # requires MOBILE_APK_PATH
./scripts/mobile-test.sh        # runs maestro/smoke.yaml
```

Set `MOBILE_APP_ID` and replace the smoke-flow placeholder selectors before running it.
The scripts intentionally fail when project-specific values are missing.

Official references: [Maestro MCP](https://docs.maestro.dev/getting-started/maestro-mcp),
[Android setup](https://docs.maestro.dev/getting-started/build-and-install-your-app/android),
and [device management](https://docs.maestro.dev/cli/start-device), [Android headless
emulator](https://developer.android.com/studio/run/emulator-commandline).
