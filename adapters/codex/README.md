# Codex adapter

`templates/*.toml` defines standalone project agents using `name`, `description`, and
`developer_instructions`. The renderer safely quotes the shared instructions as a TOML
string and writes native files to `.codex/agents/`:

```bash
python3 scripts/render-adapters.py --harness codex
python3 scripts/render-adapters.py --harness codex --check
```

The adapter exposes the same specialist names as the other harnesses, including separate
review modes. Existing product instructions are read from their unchanged Claude definitions
for this migration. No product source is authored or edited by the renderer.

Root `AGENTS.md` provides orchestration. No `.codex/config.toml` rewrite or special feature
flag is installed. Model choice, sandbox, approvals, and tools inherit the caller's settings.
Report writing requires suitable filesystem permissions; a restricted reviewer should return
its report to the orchestrator to persist when direct writing is unavailable. Do not silently
relax the sandbox. Instruction-level artifact boundaries are not filesystem enforcement.

This targets Codex releases supporting standalone `.codex/agents/*.toml` discovery; see
[official custom-agent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
The local CLI inspected during migration was 0.153.4. Older releases may use different
configuration; upgrade or supply the shared mode explicitly to an independent worker session.

Reload or start a new trusted project session after generation. No login, model request,
credential change, or live delegation is performed by installation or offline tests.
