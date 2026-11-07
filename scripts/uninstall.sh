#!/usr/bin/env sh
# Removes Herdboard from a Herdr home: what scripts/install.sh adds there, nothing else.
#
#   scripts/uninstall.sh                 # finds the Herdr home (WSL: the Windows one)
#   HERDR_APP_HOME=/path scripts/uninstall.sh
#   scripts/uninstall.sh --dry-run       # shows what it would remove; changes nothing
#
# Removes the layout file, the mod folders and the layout's section of keys.json (backup
# first: keys.json.before-herdboard-uninstall; keys.json is deleted if that section was all
# it had). Parts already gone are reported and skipped, so running it twice is safe. Leaves
# alone your other layouts, mods and keys, and Herdr's own files (shared.json, seen.json,
# installed.json). The Herdr home and the names of what it removes come from scripts/common.sh.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
. "$ROOT/scripts/common.sh"
dry_run_option "$@"
DEST=$(herdr_home) || exit 1

# Keys first, before anything is removed: a keys.json that isn't a JSON object stops the
# script here with the home untouched. Its message is printed after the files.
KEYS="${DEST:?}/keys.json"
if command -v python3 >/dev/null 2>&1; then
  KEYS_DONE=$(python3 - "$KEYS" "$DRY_RUN" "layout:${HERDBOARD_LAYOUT:?}" <<'PY'
import json, shutil, sys, os
keys, dry_run, section = sys.argv[1], sys.argv[2] == "1", sys.argv[3]
backup = keys + ".before-herdboard-uninstall"
shown = f"(backup: {os.path.basename(backup)})"
if not os.path.exists(keys):
    print("keys.json: not there, skipped")
    sys.exit(0)
try:
    mine = json.load(open(keys, encoding="utf-8"))
except ValueError as e:
    mine = e
if not isinstance(mine, dict):
    print(f"keys.json is not a JSON object ({mine}): fix or remove {keys}, then run this again; nothing was removed", file=sys.stderr)
    sys.exit(1)
if section not in mine:
    print(f"keys.json: no '{section}' section, left as it is")
    sys.exit(0)
del mine[section]
if dry_run:
    if mine:
        print(f"keys.json: would remove '{section}' {shown}")
    else:
        print(f"keys.json: would be deleted, '{section}' is all it has {shown}")
    sys.exit(0)
shutil.copy(keys, backup)
if mine:
    json.dump(mine, open(keys, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(keys, "a", encoding="utf-8").write("\n")
    print(f"keys.json: removed '{section}' {shown}")
else:
    os.remove(keys)
    print(f"keys.json: deleted, '{section}' was all it had {shown}")
PY
)
elif [ -e "$KEYS" ]; then
  KEYS_DONE="python3 not found: remove the 'layout:$HERDBOARD_LAYOUT' section from $KEYS by hand"
else
  KEYS_DONE="keys.json: not there, skipped"
fi

# drop <path under the home> <shown as>: removes it or, in a dry run, says it would; a path
# that isn't there is reported and skipped. No trailing slash on the path: for a symlinked
# folder, rm -rf removes the link, not what it points to.
drop() {
  if [ ! -e "$1" ] && [ ! -L "$1" ]; then
    report_file missing "$2 (skipped)"
  elif [ "$DRY_RUN" = 1 ]; then
    report_file remove "$2"
  else
    rm -rf "${1:?}"
    report_file removed "$2"
  fi
}

report_start removed "Uninstalling Herdboard from $DEST"
drop "${DEST:?}/layouts/${HERDBOARD_LAYOUT:?}.json" "layouts/$HERDBOARD_LAYOUT.json"
for mod in ${HERDBOARD_MODS:?}; do
  drop "${DEST:?}/mods/${mod:?}" "mods/$mod/"
done
echo "$KEYS_DONE"

report_end uninstall "Done. If Herdboard was your active layout, switch to another one in Herdr: Settings > Look > Layout."
