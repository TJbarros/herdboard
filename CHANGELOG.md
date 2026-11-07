# Changelog

All notable changes to Herdboard. Dates are YYYY-MM-DD.

## [Unreleased]

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
