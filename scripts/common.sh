# Shared by the Herdboard scripts: where the Herdr home is, and what Herdboard installs there.
# POSIX sh, sourced, never run:
#
#   ROOT=$(cd "$(dirname "$0")/.." && pwd)
#   . "$ROOT/scripts/common.sh"
#   DEST=$(herdr_home) || exit 1
#
# Sourcing it only sets the variables below and defines herdr_home; it runs nothing else.
#
#   HERDBOARD_LAYOUT  the layout's name: <home>/layouts/$HERDBOARD_LAYOUT.json and the
#                     "layout:$HERDBOARD_LAYOUT" section of <home>/keys.json.
#   HERDBOARD_MODS    the mods' names, separated by spaces: <home>/mods/<name>/ for each.
#                     Loop over it unquoted (for mod in $HERDBOARD_MODS); no name has a space
#                     or a glob character.
#   herdr_home        prints the Herdr home on stdout: $HERDR_APP_HOME if set and not empty;
#                     else on WSL the Windows one (C:\Users\<user>\.config\herdr-app, asking
#                     cmd.exe for the user); else ~/.config/herdr-app. If that folder doesn't
#                     exist, prints "Herdr home not found: ..." on stderr and returns 1.

HERDBOARD_LAYOUT=herdboard
HERDBOARD_MODS="herdboard herdboard-picker herdboard-new-menu"

herdr_home() {
  if [ -n "${HERDR_APP_HOME:-}" ]; then
    _herdr_home=$HERDR_APP_HOME
  elif grep -qi microsoft /proc/version 2>/dev/null; then
    # WSL: assumes the Herdr app runs on Windows, whose home is C:\Users\<user>\.config\herdr-app.
    _herdr_user=$(cmd.exe /c "echo %USERNAME%" 2>/dev/null | tr -d '\r')
    _herdr_home="/mnt/c/Users/$_herdr_user/.config/herdr-app"
  else
    _herdr_home="$HOME/.config/herdr-app"
  fi
  if [ ! -d "$_herdr_home" ]; then
    echo "Herdr home not found: $_herdr_home (open Herdr once, or set HERDR_APP_HOME)" >&2
    return 1
  fi
  printf '%s\n' "$_herdr_home"
}
