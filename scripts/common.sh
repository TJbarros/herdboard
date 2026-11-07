# Shared by the Herdboard scripts: where the Herdr home is, what Herdboard installs there,
# and the --dry-run option and report shape of install.sh and uninstall.sh.
# POSIX sh, sourced, never run:
#
#   ROOT=$(cd "$(dirname "$0")/.." && pwd)
#   . "$ROOT/scripts/common.sh"
#   dry_run_option "$@"
#   DEST=$(herdr_home) || exit 1
#
# Sourcing it only sets the variables below and defines the functions; it runs nothing else.
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
#
# install.sh and uninstall.sh share their one option and the shape of what they print. The
# report_* functions read DRY_RUN and DEST:
#
#   dry_run_option "$@"   sets DRY_RUN=0 for no arguments, DRY_RUN=1 for just --dry-run;
#                         anything else prints "usage: $0 [--dry-run]" on stderr and exits 2.
#   report_start <done> <heading>
#                         a dry run prints "Dry run: nothing is <done> or changed.", then
#                         "Herdr home: $DEST" and "Files:"; a real run prints <heading>.
#   report_file <state> <path>
#                         prints one line of the file list: <state> padded to 9, then <path>.
#   report_end <script> <closing>
#                         a dry run prints "Dry run done: run scripts/<script>.sh without
#                         --dry-run to <script>."; a real run prints <closing>.

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

dry_run_option() {
  case "$#:${1:-}" in
    0:) DRY_RUN=0 ;;
    1:--dry-run) DRY_RUN=1 ;;
    *) echo "usage: $0 [--dry-run]" >&2; exit 2 ;;
  esac
}

report_start() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "Dry run: nothing is $1 or changed."
    echo "Herdr home: $DEST"
    echo "Files:"
  else
    echo "$2"
  fi
}

report_file() {
  printf '  %-9s  %s\n' "$1" "$2"
}

report_end() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "Dry run done: run scripts/$1.sh without --dry-run to $1."
  else
    echo "$2"
  fi
}
