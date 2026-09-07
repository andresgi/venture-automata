# OpenCode adapter

`templates/*.md` owns OpenCode YAML metadata, including subagent mode and permissions.
Render native files with:

```bash
python3 scripts/render-adapters.py --harness opencode
```

Definitions are written to `.opencode/agents/`, retaining existing specialist names and adding
growth and branding. Product specialists are left unchanged. Shared orchestration lives in
root `AGENTS.md`; no Claude entry point is needed to obtain the workflow loop.

Reviewer edit permissions permit their report directories while denying other edits. Shell
commands for reviewers with a shell policy now require approval, with explicit push/force
patterns denied. These patterns are not a complete shell security boundary. Other existing
role metadata is retained. Models inherit the user's configuration.

`opencode.jsonc` is a reference default; active `opencode.jsonc` remains venture-owned.
The renderer never overwrites runtime settings. Use the existing project settings and
configured provider credentials when opening the venture.

Native format reference: [OpenCode agents](https://opencode.ai/docs/agents/).
Restart or reload OpenCode after generation. Offline checks validate prompt generation;
live delegation, inherited settings, and tool availability still depend on the installed harness.
