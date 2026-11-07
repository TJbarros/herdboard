#!/usr/bin/env sh
# Installs Herdboard into a Herdr home: the layout, its three mods and its keys.
#
#   scripts/install.sh                 # finds the Herdr home (WSL: the Windows one)
#   HERDR_APP_HOME=/path scripts/install.sh
#   scripts/install.sh --dry-run       # shows what it would copy and change; changes nothing
#
# Copies files only; never deletes anything of yours. Keys: adds the
# "layout:herdboard" section to keys.json if it isn't there (backup first).
# The Herdr home, the names of what it installs, the option and the report's shape come
# from scripts/common.sh.
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
. "$ROOT/scripts/common.sh"
dry_run_option "$@"
DEST=$(herdr_home) || exit 1

# put <file> <folder>: copies the file into the folder or, in a dry run, prints whether the
# copy would be new, overwrite a different file or leave an identical one unchanged.
put() {
  if [ "$DRY_RUN" = 0 ]; then
    cp "$1" "$2/"
    return
  fi
  put_to="$2/$(basename "$1")"
  if [ ! -e "$put_to" ]; then put_state=new
  elif cmp -s "$1" "$put_to"; then put_state=unchanged
  else put_state=overwrite
  fi
  report_file "$put_state" "${put_to#"$DEST/"}"
}

# folder <path>: creates it, except in a dry run.
folder() {
  if [ "$DRY_RUN" = 0 ]; then mkdir -p "$1"; fi
}

report_start created "Installing Herdboard into $DEST"
folder "$DEST/layouts"
folder "$DEST/mods"
put "$ROOT/layouts/$HERDBOARD_LAYOUT.json" "$DEST/layouts"
for mod in $HERDBOARD_MODS; do
  folder "$DEST/mods/$mod"
  for f in "$ROOT/mods/$mod"/*; do put "$f" "$DEST/mods/$mod"; done
done

# Keys: merge the layout's section, never replacing one the person already has.
KEYS="$DEST/keys.json"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$ROOT/keys.json" "$KEYS" "$DRY_RUN" "$HERDBOARD_LAYOUT" <<'PY'
import json, shutil, sys, os
src, dest, dry_run, layout = sys.argv[1], sys.argv[2], sys.argv[3] == "1", sys.argv[4]
ours = json.load(open(src, encoding="utf-8"))
mine = json.load(open(dest, encoding="utf-8")) if os.path.exists(dest) else {}
added = [k for k in ours if k not in mine]
backup = dest + ".before-herdboard"
if not added:
    print("keys.json: 'layout:" + layout + "' already there, left as it is")
    sys.exit(0)
if dry_run:
    if os.path.exists(dest):
        print("keys.json: would add " + ", ".join(added) + " (backup: " + os.path.basename(backup) + ")")
    else:
        print("keys.json: would be created with " + ", ".join(added))
    sys.exit(0)
if os.path.exists(dest):
    shutil.copy(dest, backup)
for k in added:
    mine[k] = ours[k]
json.dump(mine, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(dest, "a", encoding="utf-8").write("\n")
print("keys.json: added " + ", ".join(added) + " (backup: " + os.path.basename(backup) + ")")
PY
else
  echo "python3 not found: add the section in keys.json from $ROOT/keys.json by hand"
fi

report_end install "Done. In Herdr: Settings > Look > Layout > $HERDBOARD_LAYOUT (or: herdr-app do layout.switch --name $HERDBOARD_LAYOUT)."
