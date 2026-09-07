# Harness adapters

Shared behavior is authored in `agents/`; harness templates live in `claude/`, `opencode/`,
and `codex/`. `roles.json` maps each native specialist name to a shared file and one mode.
Product role sources are deliberately retained at their existing paths until that migration
is requested. Do not add `agents/product.md` during this change.

## Contract

A template contains exactly one `{{instructions}}` placeholder. The renderer replaces it
with the shared preamble and only the selected `## Mode: <name>` section. Claude and OpenCode
use Markdown with native YAML frontmatter; Codex uses TOML with a quoted instructions string.
The native agent name remains the same across adapters. Tools, models, permissions, and
runtime-specific options belong in the adapter templates, never in the shared instructions.

The orchestrator supplies the task, venture directory, mode, acceptance criteria, applicable
gates, and output paths. A reviewer must be a separate invocation from the author. Unsupported
capabilities must be reported; another adapter must not silently claim equivalent enforcement.

## Render and validate

```bash
python3 scripts/render-adapters.py
python3 scripts/render-adapters.py --check
python3 scripts/render-adapters.py --harness codex --preflight
python3 -B -m unittest discover -s tests -v
```

Run from the framework or a fully scaffolded venture. `--target <directory>` writes native
files to another directory; it does not copy shared rules, configure credentials, or initialize
a venture. Use `scripts/new-project.sh` for a complete new directory.

Only mapped native files and the Claude entry point are managed. The renderer checks all
selected destinations before writing. `legacy-checksums.json` permits the first migration
only over exact known original files. `generated-checksums.json` tracks installed generated
bytes so later runs refuse custom edits. Unrelated native agents and runtime settings remain
untouched. Resolve conflicts by reviewing the local edit and porting it into its adapter
source, then restoring the generated output to its last recorded version before rendering.

The settings files under the adapter directories are portable reference defaults. Active
settings remain venture-owned; the renderer does not replace them. New venture templates
retain their settings, including the existing optional Claude notification hook.

Future harness support requires a new adapter and renderer coverage for discovery, prompt
encoding, and permission behavior. It must not require copying or rewriting shared role
instructions. Paseo session management is not part of this adapter migration.
