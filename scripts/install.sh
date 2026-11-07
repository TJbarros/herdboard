#!/usr/bin/env sh
# Installs Herdboard into a Herdr home: the layout, its three mods and its keys.
#
#   scripts/install.sh                 # finds the Herdr home (WSL: the Windows one)
#   HERDR_APP_HOME=/path scripts/install.sh
#
# Copies files only; never deletes anything of yours. Keys: adds the
# "layout:herdboard" section to keys.json if it isn't there (backup first).
set -eu

SRC=$(cd "$(dirname "$0")/.." && pwd)

if [ -n "${HERDR_APP_HOME:-}" ]; then
  DEST=$HERDR_APP_HOME
elif grep -qi microsoft /proc/version 2>/dev/null; then
  # WSL: Herdr runs on Windows and reads C:\Users\<user>\.config\herdr-app.
  WINUSER=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
  DEST="/mnt/c/Users/$WINUSER/.config/herdr-app"
else
  DEST="$HOME/.config/herdr-app"
fi

if [ ! -d "$DEST" ]; then
  echo "Herdr home not found: $DEST (open Herdr once, or set HERDR_APP_HOME)" >&2
  exit 1
fi

echo "Installing Herdboard into $DEST"
mkdir -p "$DEST/layouts" "$DEST/mods"
cp "$SRC/layouts/herdboard.json" "$DEST/layouts/herdboard.json"
for mod in herdboard herdboard-picker herdboard-new-menu; do
  mkdir -p "$DEST/mods/$mod"
  for f in "$SRC/mods/$mod"/*; do cp "$f" "$DEST/mods/$mod/"; done
done

# Keys: merge the layout's section, never replacing one the person already has.
KEYS="$DEST/keys.json"
if command -v python3 >/dev/null 2>&1; then
  python3 - "$SRC/keys.json" "$KEYS" <<'PY'
import json, shutil, sys, os
src, dest = sys.argv[1], sys.argv[2]
ours = json.load(open(src, encoding="utf-8"))
mine = json.load(open(dest, encoding="utf-8")) if os.path.exists(dest) else {}
added = [k for k in ours if k not in mine]
if not added:
    print("keys.json: 'layout:herdboard' already there, left as it is")
    sys.exit(0)
if os.path.exists(dest):
    shutil.copy(dest, dest + ".before-herdboard")
for k in added:
    mine[k] = ours[k]
json.dump(mine, open(dest, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
open(dest, "a", encoding="utf-8").write("\n")
print("keys.json: added " + ", ".join(added) + " (backup: keys.json.before-herdboard)")
PY
else
  echo "python3 not found: add the section in keys.json from $SRC/keys.json by hand"
fi

echo "Done. In Herdr: Settings > Look > Layout > Herdboard (or: herdr-app do layout.switch --name herdboard)."
