# Changelog

All notable changes to Herdboard. Dates are YYYY-MM-DD.

## [Unreleased]

- Agent cards, compact entries and visible Idle rows show the pending-file total
  of their own terminal's live Git worktree, including remote machines. Clean
  results show zero; failed or missing context stays visibly unavailable. Counts
  include staged/unstaged, conflicts, renames and individual untracked files,
  exclude ignored files and share bounded queries by machine and worktree.

## [1.4.0] - 2026-11-09

- Verified Codex CLI 0.167.0 local command approvals can be answered from cards:
  Yes sends `y` for one-time approval; No sends `esc` to cancel the request and
  interrupt the turn. Full-screen, process/context and reported-agent checks
  precede each send; unverified launch configurations retain the fallback.
  The persistent choice and the tested unreported pi 0.85.1 confirmation remain
  available only in the terminal; versioned native evidence documents the scope.
- English and Portuguese usage screenshots and full previews show the card's
  localized Yes / No / More controls. Both demo GIFs show a permission request,
  a direct card answer and the same agent returning to Working. Paired README
  and guide captions describe the refreshed media and preserve the demo-data
  disclosure.

## [1.3.0] - 2026-11-08

- Blocked cards use their rendered height when sizing the board. Long workspace
  paths can wrap earlier than a character-count estimate, which clipped Open and
  answer, Peek and the waiting time on a single card in a wide window.
- Workspace-trust discovery finds a complete dialog below earlier terminal output,
  recognises a wrapped `Security guide` label at 15 columns, and recovers trailing
  folder whitespace from the process cwd. Answer validation preserves the raw dialog id.
- Startup waiting time begins when discovery recognises the request, including
  time hidden by the current-space filter before its card is first rendered.
- A workspace folder named `Security guide` can wrap onto its own row without
  hiding its trust card, header count or put-away tab. Recognition locates the
  complete known prose before the dialog's guide and preserves the raw id.
- Startup waiting time starts again when the terminal/process/folder lifecycle
  changes, even if the old source never disappears between polls. It uses that
  source's own clock rather than the tab's earlier state-change timestamp.
- Workspace-trust headings wrapped at 20–21 terminal columns are recognised before
  locating the folder, restoring the card, header count and put-away tab. Answer
  validation still requires the complete raw dialog, including heading wrapping.
- Workspace-trust options wrapped across terminal lines are reconstructed before
  checking the footer. At 24 columns, the continuation of "Yes, I trust this folder"
  was treated as footer text, hiding its card and header count. Cursor selection
  and the complete raw dialog id remain part of answer validation.
- Claude Code's recognised workspace-trust screen appears in Needs you before its
  first status report, using a separate terminal/process lifecycle. Yes trusts the
  displayed folder; No exits. Cursor answers send the required arrows and Enter
  together after rechecking the complete screen, cursor and source. Numbered
  permissions still send only their digit.
- A newly recognised startup trust request brings its put-away tab back to the
  board and header count, including when another agent shares the tab. Repeated
  reads of that request do not undo putting the tab away again, even after a
  failed answer validation invalidates the screen cache. The trust explanation
  is also recognised when it wraps in a narrow terminal, preserving the raw id.
- Workspace-trust paths split across terminal lines are reconstructed before
  matching the process cwd, so narrow terminals still show the card and header
  count. The known cwd preserves spaces when the path wraps between words and
  distinguishes breaks inside a name. The dialog id retains the original path
  lines for answer validation.
- Permission cards with **Yes** / **No** offer the dialog's other options in
  **More…** (*Mais…*), with the agent's full text in each tooltip. Choosing one
  checks the same whole dialog on a fresh screen read and presses only its digit;
  every answer control then stays disabled until the status or request changes.
  The menu closes on a choice, Escape, an outside press or the card leaving Needs
  you. Wrapped option text is joined and included in the guarded dialog id.
- Waiting time stays inside narrow permission cards, with its full text in a
  tooltip when the action row has to shorten it.

## [1.2.1] - 2026-11-07

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

[Unreleased]: https://github.com/TJbarros/herdboard/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.4.0
[1.3.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.3.0
[1.2.1]: https://github.com/TJbarros/herdboard/releases/tag/v1.2.1
[1.2.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.2.0
[1.1.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.1.0
[1.0.0]: https://github.com/TJbarros/herdboard/releases/tag/v1.0.0
