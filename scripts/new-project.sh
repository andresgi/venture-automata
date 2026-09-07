#!/usr/bin/env bash
#
# Scaffold a new venture from templates/venture-skeleton.
#
# Usage:
#   ./scripts/new-project.sh <name> [--path <destination>]
#
# Examples:
#   ./scripts/new-project.sh invoice-pilot
#     -> creates projects/invoice-pilot/
#
#   ./scripts/new-project.sh invoice-pilot --path ../invoice-pilot
#     -> creates ../invoice-pilot/ instead (e.g. for a standalone repo)

set -euo pipefail

usage() {
  echo "Usage: $0 <venture-name> [--path <destination>]" >&2
  echo "  <venture-name> must be lowercase letters, digits, and hyphens (e.g. invoice-pilot)." >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

NAME="$1"
shift

DEST=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      [[ $# -ge 2 ]] || usage
      DEST="$2"
      shift 2
      ;;
    *)
      usage
      ;;
  esac
done

if ! [[ "$NAME" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: '$NAME' is not a valid venture name (use lowercase letters, digits, hyphens — e.g. invoice-pilot)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKELETON="$REPO_ROOT/templates/venture-skeleton"

if [[ ! -d "$SKELETON" ]]; then
  echo "Error: skeleton not found at $SKELETON" >&2
  exit 1
fi

if [[ -z "$DEST" ]]; then
  DEST="$REPO_ROOT/projects/$NAME"
else
  case "$DEST" in
    /*) : ;;
    *) DEST="$(pwd)/$DEST" ;;
  esac
fi

if [[ -e "$DEST" ]]; then
  echo "Error: destination already exists: $DEST" >&2
  echo "Refusing to overwrite. Remove it first or choose a different name/--path." >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"
cp -R "$SKELETON" "$DEST"

# Ship a self-contained framework so agent loading does not depend on parent traversal.
cp "$REPO_ROOT/AGENTS.md" "$REPO_ROOT/.gitignore" "$DEST/"
cp -R "$REPO_ROOT/agents" "$REPO_ROOT/adapters" "$DEST/"
mkdir -p "$DEST/docs"
cp "$REPO_ROOT/docs/mobile-testing.md" "$DEST/docs/"
cp "$REPO_ROOT/scripts/render-adapters.py" "$DEST/scripts/"
chmod +x "$DEST/scripts/mobile-build.sh" "$DEST/scripts/mobile-install.sh" "$DEST/scripts/mobile-test.sh"
mkdir -p "$DEST/.claude/agents" "$DEST/.opencode/agents"
# Product specialists are intentionally unchanged in this migration.
for role in product-researcher product-manager product-critic; do
  cp "$REPO_ROOT/.claude/agents/$role.md" "$DEST/.claude/agents/"
  cp "$REPO_ROOT/.opencode/agents/$role.md" "$DEST/.opencode/agents/"
done
python3 "$REPO_ROOT/scripts/render-adapters.py" --target "$DEST"

# Derive a human-friendly placeholder title from the slug (e.g. invoice-pilot -> Invoice Pilot).
# Uses awk (not sed \U, which is a GNU extension unavailable on macOS's BSD sed).
TITLE="$(echo "$NAME" | awk -F'-' '{for(i=1;i<=NF;i++){$i=toupper(substr($i,1,1)) substr($i,2)}; print}' OFS=' ')"

PROJECT_FILE="$DEST/config/PROJECT.md"
if [[ -f "$PROJECT_FILE" ]]; then
  # Portable in-place sed for both GNU and BSD sed.
  sed -i.bak "s/{{VENTURE_NAME}}/$TITLE/" "$PROJECT_FILE"
  rm -f "$PROJECT_FILE.bak"
fi

echo "Created new venture: $NAME"
echo "  Location: $DEST"
echo
echo "Next steps:"
echo "  cd \"$DEST\""
echo "  Then tell your agent: \"Initialize this project.\""
echo
echo "This includes venture templates, shared agents, all three harness adapters,"
echo "and generated native definitions. Initialize the venture configuration before work."
echo "For a standalone repository, initialize its git history and configure origin separately."
