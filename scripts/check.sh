#!/usr/bin/env sh
# Runs every local check before a commit: `herdr-app check` on each mod in the
# repository (every mods/*/ with a mod.json), then `node --test` from the repo root.
#
#   scripts/check.sh                   # from any directory
#
# Checks the repository's own files; installs nothing.
set -u

ROOT=$(cd "$(dirname "$0")/.." && pwd)

for mod in "$ROOT"/mods/*/; do
  [ -f "$mod/mod.json" ] || continue
  mod=${mod%/}
  echo "==> herdr-app check mods/${mod##*/}"
  herdr-app check "$mod"
done

echo "==> node --test"
(cd "$ROOT" && node --test)

echo "All checks passed."
