# Herdboard guide

[← Back to the README](../README.md) · [Português (Brasil)](guide.pt-BR.md)

## Using Herdboard

### Start an agent in the right project

1. Click **+** next to the tabs (or press `Ctrl+Shift+T`).
2. Under **Open in**, pick the project folder. The first one is where the active
   tab is now; the others are the folders of your other open terminals.
3. Pick **Terminal** or an agent (Claude Code, Codex, Gemini…). The new tab opens
   in that folder, in the current space.

<img src="images/usage-new-tab.png" width="302" alt="New tab menu: Open in lists project folders, then Terminal and the installed agents">

*The **+** menu: pick the folder under **Open in**, then a terminal or an agent.*

Need a new project instead? **⋯ › New space** creates a space in the active tab's
folder; **+ › New space** creates it in the folder picked under **Open in**. Both
stay on the active space's machine.

### Answer an agent that needs you

When an agent stops to ask something, its card jumps to **Needs you** and the column
turns red. If it's in another space, that space's pill in the header turns red too.

<img src="images/usage-needs-you.png" width="470" alt="Needs you column with a blocked card showing the agent's question and the Open and answer and Peek buttons">

*A blocked agent: its question, **Open and answer**, **Peek** and how long it has been waiting.*

1. Read the question right on the card: it shows the last lines of the agent's
   screen, without frames or separator lines (so a command between Claude Code's
   dashed rows shows), for example *"npm run db:migrate --env=staging · Apply 3
   pending migrations · Do you want to proceed?"*.
2. **Open and answer** focuses that agent's terminal, so you can type the answer.
   **Peek** opens it on top, without leaving the tab you're in.

**Yes / No for a permission dialog.** When the question is a Claude Code permission
dialog ("Do you want to proceed?") with options labelled exactly *Yes* and *No*, the
card also shows **Yes** and **No**. Each one presses that option's number in the
agent's terminal (no Enter), as you would; hover it to see the option's text. The
card then follows the agent's new status: it leaves **Needs you** once the agent
moves on. Before typing, the board checks that the agent is still blocked on the
same dialog: it reads the screen again and compares the whole request (every line of
the dialog, not just the part the card shows), and a button only answers the request
its card showed; if anything changed, it types nothing and reads the question again.
**More…**, next to Yes / No, lists the dialog's other numbered options (digits 1–9),
such as "Yes, and always allow…" or "Yes, and switch to auto mode". These can grant
more than one approval. The menu keeps the agent's own text, including wrapped lines;
hover a shortened item to read all of it. Choosing one runs the same check and presses
only its digit. The menu closes after a choice, on Escape or a press outside it, and
when the card leaves Needs you or gets a new request. After any answer all three
controls stay faded until the agent's status or request changes, so a second click
types nothing. More… appears only when Yes / No has other options to offer. For
dialogs without a plain Yes / No pair, use **Open and answer**.

In a narrow column, hover the shortened waiting time to read it in full.

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

<img src="images/usage-hover.png" width="460" alt="Working column: hovering a card shows Peek, Pin and Put away; another card shows the stuck? hint">

*Hovering a card shows **Peek**, **Pin** and **Put away**; this one has been working
for 47 minutes, so it also shows **stuck?**.*

<img src="images/usage-filter.png" alt="Header with This space selected: the board shows only the web-app space's agents">

*With **This space** selected, the board shows only the agents of the active space
(here, `web-app`).*

### Focus on the terminal

**Expand** (right of the tabs) hides the header and the board, so the terminals
take the whole window; **Restore** brings them back. Tabs, **+** and **×** stay on
the rail while expanded.

<img src="images/usage-expand.png" alt="Expanded: only the tab rail with Restore and the terminal are shown">

*Expanded: the tab rail (with **Restore** on the right) and the terminal.*

### Reading a card

<img src="images/usage-card.png" width="448" alt="A card: agent icon and task title on top; space, tab, branch and age below; a colored stripe on the left">

- **Left stripe**: the status color (here amber, Working).
- **Top line**: the agent's icon and its task title.
- **Bottom line**: space · tab · branch, and on the right how long it has been in
  this status.
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

- What runs besides drawing: the board runs `hc read <terminal> --lines 0`
  (Herdr's own CLI) each time an agent gets blocked, to read its question; if that
  read misses it (no question on screen yet or, for a Claude Code permission
  dialog, no Yes / No), it reads up to two more times, 0.5 s later and then another
  1.5 s later, only while the agent stays blocked. It reads again when you click
  Yes / No or choose a More… option, and then runs `hc keys <terminal> <digit>`; the search
  runs `hc machine ls`, as Herdr's own search does; the new-tab menu asks Herdr which
  agents are installed. No mod downloads anything from the internet or reads your files.
- The Peek window and Herdr's sidebar are Herdr's own and stay in English.
- Herdr can't change a space's registered folder after it's made; Herdboard always
  uses the terminals' live folders instead.
- Preferences live in Herdr's shared state under `herdboard.*`.

## FAQ

**A card says "No task title".** The agent hasn't named a task yet (for example, a
session where you only said hello). The title is the one the agent sets on its
terminal: in our tests, Claude Code set it once it started working on a task. From
then on, Herdboard keeps it even through `/clear`.

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
herdboard/scripts/update.sh
```

It fast-forwards your clone (`git pull --ff-only`) and runs `scripts/install.sh`
again. Herdr reloads the layout and mods by itself; no restart needed. To see which
files an install would overwrite, run `scripts/install.sh --dry-run`: it lists each file
as **new**, **overwrite** or **unchanged**, says what would happen to `keys.json`, and
changes nothing.

If you edited a file in the clone (`STUCK_MIN`, say), the update stops before
pulling and lists what you changed. To keep your edits, run this inside the clone:

```sh
git stash && scripts/update.sh && git stash pop && scripts/install.sh
```

If it stops partway, your edits stay stashed; `git stash pop` brings them back. If
you'd rather commit your edits, the update can't fast-forward once Herdboard has new
commits too: run `git pull --rebase && scripts/install.sh` instead. The update also
stops, without installing, whenever your branch can't fast-forward (your commits and
new Herdboard commits both, or it isn't tracking a remote branch), and says so.

## Uninstall

```sh
herdboard/scripts/uninstall.sh
```

It finds your Herdr home the way the install does and removes `layouts/herdboard.json`,
the `mods/herdboard`, `mods/herdboard-picker` and `mods/herdboard-new-menu` folders,
and the `"layout:herdboard"` section of `keys.json`, backing `keys.json` up first to
`keys.json.before-herdboard-uninstall` (if that section was all it had, `keys.json` is
deleted). Your other layouts, mods and keys are untouched. Parts already gone are
skipped, so running it twice is safe. If Herdboard was your active layout, switch to
another one in Herdr (**Settings › Look › Layout**) or with `Ctrl+Shift+L`.

To see first what it would remove, run `scripts/uninstall.sh --dry-run`: it lists each
file, folder and `keys.json` change, and changes nothing.
