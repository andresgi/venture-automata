# Claude adapter

`templates/*.md` owns Claude YAML metadata. `CLAUDE.md` supplies the root import of shared
orchestration in `AGENTS.md`. Render both with:

```bash
python3 scripts/render-adapters.py --harness claude
```

Native definitions are written to `.claude/agents/`. Fourteen existing specialists use shared
modes; growth and branding are added. The three existing product specialists remain untouched.
Existing model and turn limits are retained in templates; new roles inherit the parent model.

`settings.json` is the portable reference copied from the venture skeleton, including the
user's optional Telegram notification hook. Active `.claude/settings.json` remains unchanged
and is never overwritten by rendering or framework sync. Its hook still invokes
`scripts/hooks/deny-force-push.sh`; the hook is not a universal shell policy engine.

Tool allowlists and permission controls are distinct from a role's instruction not to edit
production code. Reviewers may write reports; shared instructions constrain their assigned
artifacts. No blanket permission bypass is enabled by this adapter.

Native format reference: [Claude custom subagents](https://code.claude.com/docs/en/sub-agents).
Reload the agent definitions or start a new session after generation. Live delegation and
browser tooling were not exercised by the offline adapter tests.
