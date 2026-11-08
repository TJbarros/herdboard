#!/usr/bin/env sh
# Updates Herdboard: fast-forwards the clone this script lives in, then installs it.
#
#   scripts/update.sh                  # from any directory; no options
#
# Any argument (even --dry-run, which install.sh and uninstall.sh take) prints a usage
# line and exits 2 before git runs: there is no dry run of an update.
#
# Stops before pulling if a tracked file has changes of yours, and before installing
# if git can't fast-forward. Runs scripts/install.sh with no arguments, so it finds
# the Herdr home (or uses HERDR_APP_HOME) the same way it does when you run it.
#
# Everything runs inside main(), called on the last line, and the install replaces
# this shell (exec): the pull may rewrite this file while sh is still reading it.
set -eu

main() {
  if [ "$#" -ne 0 ]; then
    echo "usage: $0" >&2
    exit 2
  fi
  ROOT=$(cd "$(dirname "$0")/.." && pwd -P)

  if ! command -v git >/dev/null 2>&1; then
    echo "git not found: install git, or update by hand (download Herdboard again, then scripts/install.sh)" >&2
    exit 1
  fi
  # Its own repository, not one it happens to sit in (a zip unpacked inside another repo).
  # git's own reason (e.g. "dubious ownership" under /mnt/c) shows above this message.
  TOP=$(git -C "$ROOT" rev-parse --show-toplevel || :)
  if [ -z "$TOP" ] || [ "$(cd "$TOP" && pwd -P)" != "$ROOT" ]; then
    echo "$ROOT is not a git clone (downloaded as a zip?): download Herdboard again, then run scripts/install.sh" >&2
    exit 1
  fi

  CHANGED=$(git -C "$ROOT" status --porcelain --untracked-files=no)
  if [ -n "$CHANGED" ]; then
    {
      echo "Not updated: these files in $ROOT have changes of yours:"
      echo "$CHANGED"
      echo "To keep them, set them aside, update, then bring them back and install them (in $ROOT):"
      echo "  git stash && scripts/update.sh && git stash pop && scripts/install.sh"
      echo "If that stops partway, your changes stay stashed: git stash pop brings them back."
      echo "Or commit them; the update then can't fast-forward, so run"
      echo "  git pull --rebase && scripts/install.sh"
      echo "yourself instead."
    } >&2
    exit 1
  fi

  if ! git -C "$ROOT" pull --ff-only --no-rebase; then
    echo "Update not applied: git could not fast-forward $ROOT (see above). Nothing was installed." >&2
    exit 1
  fi

  exec sh "$ROOT/scripts/install.sh"
}

main "$@"
