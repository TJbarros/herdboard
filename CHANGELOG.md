# Changelog

All notable changes to Herdboard. Dates are YYYY-MM-DD.

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

[1.0.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.0.0
