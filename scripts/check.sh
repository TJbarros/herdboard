#!/usr/bin/env sh
# Runs every local check before a commit: `herdr-app check` on each mod in the
# repository (every mods/*/ with a mod.json), then `node --test` from the repo root.
#
#   scripts/check.sh                   # from any directory
#
# Every step runs even after one fails; exits non-zero if any did, naming them.
# Checks the repository's own files; installs nothing.
set -u

ROOT=$(cd "$(dirname "$0")/.." && pwd)
FAILED=

MISSING=0
for tool in herdr-app node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "$tool not found on PATH" >&2
    MISSING=1
  fi
done
[ "$MISSING" -eq 0 ] || exit 1

# step <name> <command...>: announces the step, runs it, records whether it passed.
step() {
  name=$1
  shift
  echo "==> $name"
  if "$@"; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    FAILED="$FAILED  - $name
"
  fi
}

run_tests() {
  (cd "$ROOT" && node --test)
}

for mod in "$ROOT"/mods/*/; do
  [ -f "$mod/mod.json" ] || continue
  mod=${mod%/}
  step "herdr-app check mods/${mod##*/}" herdr-app check "$mod"
done

step "node --test" run_tests

echo
if [ -n "$FAILED" ]; then
  echo "Failed steps:"
  printf '%s' "$FAILED"
  exit 1
fi
echo "All checks passed."
