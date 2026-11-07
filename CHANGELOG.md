# Changelog

All notable changes to Herdboard. Dates are YYYY-MM-DD.

## [Unreleased]

- A blocked card's question shows the command a Claude Code permission dialog asks
  about, not the dashed separator rows around it: lines made only of horizontal
  line glyphs (`─`, `╌`, `┄` …) are left out.
- When the first screen read of a blocked agent misses the question (it isn't on
  screen yet or, for a Claude Code permission dialog, the Yes / No can't be shown
  yet), the board reads it up to two more times, after 0.5 s and then 1.5 s more,
  while the agent stays blocked, so the card gets the question (and, for a
  permission dialog, its Yes / No) without a status change.
- `scripts/install.sh --dry-run` shows what an install would do without changing
  anything: the Herdr home it found, every file it would copy (new, overwrite or
  unchanged) and what would happen to `keys.json`. Any other option is now an error
  with a usage line (before, options were ignored and the install ran). The Herdr
  home and the names of what Herdboard installs live in `scripts/common.sh`.

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

[Unreleased]: https://github.com/TJbarros/herdboard/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.1.0
[1.0.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.0.0
