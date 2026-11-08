# Changelog

All notable changes to Herdboard. Dates are YYYY-MM-DD.

## [Unreleased]

- `scripts/install.sh` and `scripts/uninstall.sh` write `keys.json` with LF line
  endings only and print LF-only lines on every platform. Under Git Bash with a
  Windows Python they wrote every line of `keys.json` and their own messages with
  CRLF. The `keys.json` step now needs Python 3.7 or later.

## [1.2.0] - 2026-11-07

- A blocked card's question shows the command a Claude Code permission dialog asks
  about, not the dashed separator rows around it: lines made only of horizontal
  line glyphs (`─`, `╌`, `┄` …) are left out.
- When the first screen read of a blocked agent misses the question (it isn't on
  screen yet or, for a Claude Code permission dialog, the Yes / No can't be shown
  yet), the board reads it up to two more times, after 0.5 s and then 1.5 s more,
  while the agent stays blocked, so the card gets the question (and, for a
  permission dialog, its Yes / No) without a status change.
- `scripts/check.sh` runs every local check before a commit: `herdr-app check` on
  each mod in `mods/` (every folder with a `mod.json`), then `node --test` from the
  repository root, from any directory. Every step runs even after one fails; it
  exits non-zero and names the failed steps, or the missing `herdr-app` / `node`.
- `scripts/install.sh --dry-run` shows what an install would do without changing
  anything: the Herdr home it found, every file it would copy (new, overwrite or
  unchanged) and what would happen to `keys.json`. Any other option is now an error
  with a usage line (before, options were ignored and the install ran). The Herdr
  home and the names of what Herdboard installs live in `scripts/common.sh`.
- `scripts/update.sh` updates in one step: `git pull --ff-only` in the clone, then
  `scripts/install.sh`, from any directory. It stops before pulling if a tracked
  file has local edits (listing them, with `git stash` / commit as the way to keep
  them), and before installing if the pull can't fast-forward. It takes no options:
  any argument, `--dry-run` included, is an error with a usage line. The guide's
  "Update" section now uses it.
- `scripts/uninstall.sh` removes Herdboard in one step: the layout file, its three
  mod folders and the `"layout:herdboard"` section of `keys.json` (backup first:
  `keys.json.before-herdboard-uninstall`; `keys.json` is deleted if that section was
  all it had), nothing else. Parts already gone are skipped; a `keys.json` that isn't
  valid JSON stops it before anything is removed. `--dry-run` lists every change and
  makes none. The guide's "Uninstall" section now uses it.

## [1.1.0] - 2026-11-07

- Blocked cards answer a Claude Code permission dialog: **Yes** / **No** (*Sim* /
  *Não*) press the number of the option labelled exactly "Yes" or "No" in the
  agent's terminal, after checking that the agent is still blocked on the same
  dialog (the whole request on a fresh screen read, not just the card's text) and
  that the button belongs to the request currently shown. Shown only when the
  screen has both options.

## [1.0.0] - 2026-11-07

First public release.

- Kanban of every agent in every space: Needs you, Working, Done, Idle.
- Blocked cards show the agent's question (read with `hc read --lines 0`), with
  Open and answer and Peek.
- Cards with task title, space · tab · branch and time in status; "stuck?" after
  30 minutes working; the last task title survives `/clear`.
- Hover actions: Peek, Pin, Put away. Compact, foldable Idle column.
- One-line header: spaces, All / This space filter, search, PT / EN, ⋯ menu.
  Herdr's sidebar folded on the left.
- Workspace rail: tabs, new tab (+), close tab (×), Expand / Restore.
- New-tab menu with a folder picker; new tabs and spaces start in the chosen folder.
- Follows the Herdr theme; responsive down to ~760px; English and Portuguese.
- `scripts/install.sh` (tested on Windows from WSL and Git Bash), README and guide in
  both languages.

[Unreleased]: https://github.com/TJbarros/herdboard/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.2.0
[1.1.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.1.0
[1.0.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.0.0
