# Herdboard

A kanban board for your coding agents in Herdr. See which one needs you, and what it
is asking, at a glance: every agent of every space in four columns (Needs you,
Working, Done, Idle), above the live terminals of the active tab. Follows your Herdr
theme; English and Portuguese.

![Herdboard](preview.png)

## What you see

Left to right: Herdr's own sidebar folded to its 44px icon rail, then the board
column, top to bottom:

1. **Header**, 56px, `chrome` background, one line: Herdboard logo (22px,
   `mods/herdboard/logo.svg`) and "Herdboard" (14px semibold); a 1px divider; the space
   strip (every space as a 28px pill: status dot or hollow ring when it has no
   agents, name 13px, agent count; the active one `selected` with a 2px `accent`
   underline; a blocked one tinted `blocked` at 12%), scrolling sideways; the
   All | This space segment; Search (icon + label); a PT | EN segment; a 30px ⋯
   button.
2. **Board**, height = its tallest column (140–360px), `canvas`, 1px `border`
   frame. Four equal columns, 16px gaps (10 below 1100px). Column header 26px:
   status dot, label 13px semibold, count chip (status color at 14%). Cards 64px,
   `background`, 7px corners, 3px status stripe: program icon + task title (13px
   semibold), then space · tab · branch and the age (11px `muted`). Blocked cards
   are taller: the question in a mono box tinted `blocked`, then, for a permission
   dialog, *Yes* and *No* (24px outlined buttons, their own row), then *Open and
   answer* (solid `blocked`) and *Peek*. Idle agents are 44px rows (icon, task over where,
   age). Empty columns: a 40px outlined "None".
3. **Workspace**, the rest, padding 12/24: a 36px `chrome` rail (tabs as 26px chips
   with status dot, × on the active/hovered one, a + after them; on the right the
   shown program's icon, name and status dot, and Expand), then the active tab's
   panes (`background`, 7px corners, 12px gaps; a pane header only when split).

## How it behaves

| Status | Column | Color |
| --- | --- | --- |
| blocked | Needs you (column gets a 6% tint and border) | theme `blocked` |
| working | Working ("stuck?" chip past 30 min) | theme `working` |
| done | Done | theme `done` |
| idle | Idle (compact rows, foldable) | theme `idle` |

- Cards: click focuses the agent (`agent.focus`); hover shows Peek
  (`terminal.peek`), Pin / Unpin (`terminal.pin`, pinned first in the column) and
  Put away (`tab.settle`; settled tabs leave the board).
- Task title: the terminal title without spinner glyphs (program names and bare
  addresses like `t2` don't count); the last one seen is kept in shared
  `herdboard.titles` and shown as "Last: …" when the agent has none.
- Age: Herdr's per-tab `working_since` / `changed_at` when the agent is alone in
  its tab, else the time the board first saw the status; refreshed every 30s.
- Blocked question: on each new blocked spell (address + `seq`), `hc read <t>
  --lines 0`; the last line ending in "?" and up to two before it, frames dropped,
  tail kept (≤180 chars). No "?": "Open the terminal to see what the agent is
  asking." Parsed by `mods/herdboard/ask.js` (pure; `node --test` runs
  `tests/ask.test.js`).
- Yes / No: the same read also collects the numbered options below the question
  (`❯ 1. Yes` … `4. No`, numbered 1, 2, 3… in order; other lines skipped). Buttons
  only for a Claude Code agent (`app` "claude-code"), when one option's text is
  exactly "Yes" and one's exactly "No" (once each, digits 1–9), and the agent's
  `report.kind` (from `terminals()`) is absent or `permission`.
  Mapped by text, never by position. Tooltip: the option's number and text. Click:
  drop the cached options (buttons faded and inert until status or `seq` changes),
  check the agent is still `blocked` with the same `address#seq`, read the screen
  again and require the same question and options, then `hc keys <t> <digit>` (no
  `enter`). Any mismatch: type nothing, forget the read, so the card reads again.
- Space pill: `space.select`. Filter, language and Idle fold persist in shared
  `herdboard.filter`, `herdboard.lang`, `herdboard.idleOpen`.
- ⋯ menu (popup copy of the mod, role `menu`): New space and New tab in the active
  tab's live folder and machine; Back to the default layout (toast, then
  `layout.switch main`).
- + / Ctrl+Shift+T: `herdboard-new-menu` popup: "Open in" folder choice (active
  tab's live folder first, then other terminals' folders, homes left out), Terminal,
  installed agents, New space, worktrees; `tab.new` gets `folder`, `space.new` gets
  `folder` and `machine`.
- Expand hides `herdboard-header` and `herdboard-cards`; Restore shows them.
- Below 1100px buttons become icons; below 800px the board is one list, most
  urgent first, each card labelled with its status; below 760px pills drop counts
  and the filter reads All | Here.
- `setAgentOrder` follows the board (Idle skipped while folded).

## Built from

- **Layout** `layouts/herdboard.json`: root `row` (`titlebar: "none"`, `background:
  "canvas"`, Geist UI font), children: Herdr's `sidebar` column (as in `main`,
  `size: {px: 44}`), and `herdboard-main` column: `herdboard-header` block (56px,
  `window_drag`, mod `herdboard` role `header`), `herdboard-cards` block (min 140,
  max 360, mod `herdboard`), `workspace` column (`workspace-title` 36px block, role
  `terminals`; `live-terminals` block `{tab: "active", pane: {lone: false, header:
  role "pane"}}`).
- **Mods**: `herdboard` (roles header, terminals, pane, menu, none = board),
  `herdboard-picker` (Herdr's `picker`, translated), `herdboard-new-menu` (Herdr's
  `new-menu`, translated, with the folder choice). Uses the shipped
  `workspace-chrome`, `spaces` and `agents` mods in the sidebar and their icons.
- **herdr API**: `agents`, `terminals` (an agent's `report`), `spaces`, `panes`,
  `layout`, `theme`, `shared` / `setShared`, `run`, `hc`, `openOverlay` /
  `closeOverlay`, `notify`, `setAgentOrder`, `knownAgents`.
- **Programs run**: `hc read <t> --lines 0` (board, blocked agents; again on a Yes /
  No click), `hc keys <t> <digit>` (Yes / No) and
  `hc machine ls` (picker, as Herdr's own); `knownAgents()` (new-tab menu). **Art**:
  `logo.svg`, `maximize.svg`, `minimize.svg`, `preview.svg`.
- **Keys** (`keys.json`, section `layout:herdboard`): Ctrl+Shift+T new-tab menu,
  Ctrl+Shift+K picker.

## Watch out

- The board resizes its own block with `layout.resize` to fit its tallest column;
  keep fitHeight's limits and the layout's min/max equal (140/360) or it will keep
  asking for sizes the layout refuses.
- Popups and pane headers are copies of the same mod: only the board copy (no
  `role`) fetches questions, ticks the timer or migrates preferences.
- Every header control stops `mouse_down`: the header is a window-drag block.
- Card action buttons stop propagation, or the card's `agent.focus` fires too
  (Yes / No as well, even when faded).
- `hc keys` presses keys blindly: never send a Yes / No digit without the stale
  check (same `address#seq` and the same dialog on a fresh read). `seq` alone is
  not enough: the screen lags the status, and `turn` doesn't change on a decline.
- `blockedHeight` counts the Yes / No row (24px + 8px gap) when it shows; keep it
  in step with the card.
- From a script, `space.new` without `machine` targets this computer, not the
  space's machine: always pass it.
- Herdr can't change a space's registered folder; use the panes' live `cwd`.
- `hc read` with history may scroll full-screen apps: use `--lines 0`.

## Done when

- Every agent shows in its status column and the counts match; idle rows fold.
- A blocked agent's card shows its question and *Open and answer* focuses it.
- A Claude Code permission dialog gets *Yes* / *No*; each presses its option's digit
  (no `enter`) and the card leaves Needs you when the status changes. A screen
  without an exact Yes / No pair looks as before. `node --test` passes.
- Clicking a space pill, a tab chip, + and × do what they say; new tabs open in
  the active tab's live folder.
- PT | EN switches every text of the board, picker and new-tab menu.
- At 1280, 1024 and 760px wide nothing overlaps; Expand / Restore round-trips.
- `herdr-app check` passes for `mods/herdboard`, `mods/herdboard-picker` and
  `mods/herdboard-new-menu`.
