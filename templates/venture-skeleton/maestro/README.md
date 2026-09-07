# Maestro flows

Store repeatable Android user journeys in this directory. Replace the placeholder
`appId` in `smoke.yaml`, then add flows for the venture's highest-risk journeys.

The starter scripts expect:

- `MOBILE_BUILD_COMMAND` — command producing the debug APK
- `MOBILE_APK_PATH` — APK path after the build
- `MOBILE_APP_ID` — Android package name
- `ANDROID_DEVICE_ID` — optional ADB/Maestro device ID

Example:

```bash
export MOBILE_BUILD_COMMAND='npm run android:build'
export MOBILE_APK_PATH='android/app/build/outputs/apk/debug/app-debug.apk'
export MOBILE_APP_ID='com.example.app'

./scripts/mobile-build.sh
./scripts/mobile-install.sh
./scripts/mobile-test.sh maestro/smoke.yaml
```

Replace the build command with the venture's stack-specific command. Do not commit
secrets or real user data in flows.
