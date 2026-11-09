#!/usr/bin/env sh
# Check every mod against the installed Herdr declarations. Native checks generate
# gpui-kit.d.ts; our complete, versioned configs do not depend on local jsconfig files.
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TSC="$ROOT/node_modules/.bin/tsc"
if [ ! -x "$TSC" ]; then
  echo "TypeScript not installed: run npm ci in $ROOT" >&2
  exit 1
fi
FAILED=0
for mod in "$ROOT"/mods/*/; do
  [ -f "$mod/mod.json" ] || continue
  mod=${mod%/}
  echo "Typechecking mods/${mod##*/}"
  if ! "$TSC" --project "$mod/tsconfig.json"; then FAILED=1; fi
done
exit "$FAILED"
