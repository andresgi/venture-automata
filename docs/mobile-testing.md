# Mobile testing with Maestro MCP

This framework supports optional agent-driven Android testing through Maestro's Model
Context Protocol (MCP). A venture opts in under `config/CONSTRAINTS.md`; mobile QA is
manual by default.

Install Maestro CLI, configure an Android Studio emulator, and verify:

```bash
maestro --version
maestro list-devices
```

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

Official references: [Maestro MCP](https://docs.maestro.dev/getting-started/maestro-mcp),
[Android setup](https://docs.maestro.dev/getting-started/build-and-install-your-app/android),
and [device management](https://docs.maestro.dev/cli/start-device).
