<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="Herdboard logo"></p>

<h1 align="center">Herdboard</h1>

<p align="center"><b>English</b> · <a href="README.pt-BR.md">Português (Brasil)</a></p>

A kanban board for your coding agents, as a [Herdr](https://herdr.dev) layout.
Every agent in every space is a card in four columns: Needs you, Working, Done and
Idle. Blocked cards show what the agent is asking; the live terminals of the active
tab fill the rest of the window.

![Herdboard](preview.png)

## What it does

- **Kanban of agents.** Four equal columns, cards stacked; the board grows with its
  longest column (140–360px) and each column scrolls on its own.
- **Cards that say what's going on.** The agent's icon and task title, then space ·
  tab · branch and how long it has been in that status. A working agent past 30
  minutes gets a "stuck?" hint. The last task title is kept, so it survives `/clear`.
- **Needs you, answered from the board.** A blocked card shows the question from the
  agent's screen (`hc read --lines 0`: visible screen only, no scrolling, no keys
  sent), with *Open and answer* and *Peek*.
- **Hover actions.** Peek (terminal on top, without switching tabs), Pin (top of
  the column), Put away (settles the tab until an agent in it needs you).
- **Idle stays small.** Idle agents are compact rows (icon, task, where, age) and the
  column folds.
- **One-line header.** Spaces (every one, with or without agents), All / This space
  filter, search, PT / EN switch and a ⋯ menu (new space, new tab, back to Herdr's
  default layout). Herdr's own sidebar sits folded on the left.
- **Workspace rail.** The active space's tabs, a **+** that opens the new-tab menu,
  close on the active tab, the shown program and Expand (terminals fill the window).
- **New tabs in the right folder.** The new-tab menu starts tabs, agents and spaces
  in the active tab's live folder, and lets you pick another project folder from
  your open terminals.
- **Follows your theme**, light or dark. **Responsive** down to ~760px (a single
  list below 800px).
- **Two languages:** English and Portuguese (Brazil), switchable in the header.

## Install

Requires Herdr (tested with herdr-app 0.1.13).

```sh
git clone https://github.com/TJbarros/herdboard.git
cd herdboard
scripts/install.sh            # on WSL it finds the Windows Herdr home
```

Then in Herdr: **Settings › Look › Layout › Herdboard**, or
`herdr-app do layout.switch --name herdboard`. `Ctrl+Shift+L` cycles back to your
other layouts. `scripts/install.sh` only copies files and adds the
`layout:herdboard` section to `keys.json` (with a backup) when it isn't there.

To install by hand, copy `layouts/herdboard.json` to `~/.config/herdr-app/layouts/`,
the three `mods/herdboard*` folders to `~/.config/herdr-app/mods/`, and merge
`keys.json` into yours.

## Using Herdboard

### Start an agent in the right project

1. Click **+** next to the tabs (or press `Ctrl+Shift+T`).
2. Under **Open in**, pick the project folder. The first one is where the active
   tab is now; the others are the folders of your other open terminals.
3. Pick **Terminal** or an agent (Claude Code, Codex, Gemini…). The new tab opens
   in that folder, in the current space.

Need a new project instead? **⋯ › New space** (or **+ › New space**) creates a
space in the active tab's folder, on the same machine.

### Answer an agent that needs you

When an agent stops to ask something, its card jumps to **Needs you**, the column
turns red and its space pill in the header lights up.

1. Read the question right on the card: it shows the last lines of the agent's
   screen, for example *"npm run db:migrate --env=staging · Apply 3 pending
   migrations · Do you want to proceed?"*.
2. **Open and answer** focuses that agent's terminal, so you can type the answer.
   **Peek** opens it on top, without leaving the tab you're in.

If the question isn't on screen (for example, it scrolled away), the card says
*"Open the terminal to see what the agent is asking."*

### Keep an eye on many agents

- **All / This space** in the header: every agent, or only the active space's.
- **Pin** (hover a card): keeps an agent at the top of its column.
- **Put away** (hover a card): takes that tab off the board while it runs; it comes
  back by itself when an agent in it needs you.
- **"stuck?"**: a working card past 30 minutes gets this hint. Peek at it to see if
  it is still making progress.
- **Idle › fold**: folds the Idle column when you only care about active work.
- Click any card to jump to its space and tab; click a space pill to switch space.

### Focus on the terminal

**Expand** (right of the tabs) hides the header and the board, so the terminals
take the whole window; **Restore** brings them back. Tabs, **+** and **×** stay on
the rail while expanded.

### Reading a card

```
┌─┬───────────────────────────────────────────────┐
│█│ [icon] Add rate limiting to /v1/orders          │  ← agent + task title
│█│ web-app · tab 1 · feat/rate-limit   for 12 min  │  ← space · tab · branch · age
└─┴───────────────────────────────────────────────┘
 └ stripe: status color
```

- **Title**: what the agent named its task. After `/clear` the card shows
  **Last: …**, the last title Herdboard saw for that terminal.
- **Age**: how long it has been in this status (*waiting*, *for*, *finished … ago*).
- Hover the card for the full title, place, program and terminal address.

### Back to your usual layout

**⋯ › Back to the default layout** switches to Herdr's own layout (a toast says how
to come back). `Ctrl+Shift+L` cycles layouts; **Settings › Look › Layout** lists
them all.

## Keys (while Herdboard shows)

| Key | Action |
| --- | --- |
| `Ctrl+Shift+T` | New tab menu (pick folder, terminal or agent) |
| `Ctrl+Shift+K` | Find a space or tab |
| `Ctrl+Shift+W` | Close the tab |
| `Ctrl+Shift+B` | Hide / show Herdr's sidebar |
| `Ctrl+Shift+L` | Switch layout |

## Good to know

- The mod runs `hc read` (Herdr's own CLI) once per blocked spell to read the
  agent's question. It doesn't use the network, run other programs or read files
  outside its folder.
- The Peek window and Herdr's sidebar are Herdr's own and stay in English.
- Herdr can't change a space's registered folder after it's made; Herdboard always
  uses the terminals' live folders instead.
- Preferences live in Herdr's shared state under `herdboard.*`.

## FAQ

**A card says "No task title".** The agent hasn't named a task yet (for example, a
session where you only said hello). Claude Code names it as soon as it starts real
work; after that, Herdboard keeps the title even through `/clear`.

**A new tab opened in the wrong folder.** New tabs start where the active tab's
terminal *is*, not where the agent works: an agent started in `~/projects` that runs
`cd my-app && …` inside its commands is still in `~/projects`. Pick the project under
**Open in** on the **+** menu, or start agents from that menu so they begin in the
project folder.

**The time on a card looks wrong.** Herdr records times per tab. When a tab has more
than one agent, Herdboard counts from when it first saw each one's status instead.

**Can I change the 30-minute "stuck?" limit?** Yes: `STUCK_MIN` at the top of
`mods/herdboard/main.js`, then run `scripts/install.sh` again.

**Does it work with light themes?** Yes. Every color comes from your Herdr theme.

## Update

```sh
cd herdboard
git pull
scripts/install.sh
```

Herdr reloads the layout and mods by itself; no restart needed.

## Uninstall

Switch to another layout, then delete `layouts/herdboard.json` and the
`mods/herdboard`, `mods/herdboard-picker` and `mods/herdboard-new-menu` folders from
your Herdr home (`~/.config/herdr-app`), and remove the `"layout:herdboard"` section
from its `keys.json`. Your other layouts and keys are untouched.

## License

Apache License 2.0. Derived from the `board` example in
[herdr-layout-examples](https://github.com/herdrdev/herdr-layout-examples) and from
mods shipped with Herdr; see [NOTICE](NOTICE).
