# Cursor CLI cards: issue #29 verification

[Português](issue-29-verification.pt-BR.md). Recorded 2026-11-09 on Linux.

## Source and supported launch forms

Tested herdr-app **0.1.14**, hc **0.1.19**, Cursor CLI
**2026.11.05-86047df** and Node **24.22.1**. Cursor's
[official overview](https://cursor.com/docs/cli/overview) documents interactive
`agent`. The installed `agent` symlink resolves to the versioned `cursor-agent`
launcher, which executes its bundled Node with its own path as argv[0], an
optional `--use-system-ca` and the same installation's `index.js`.

The three privacy-sanitized [native core fixtures](../tests/fixtures/cursor-2026.11.05/)
record a direct `agent`, a shell running `agent`, and `agent --yolo` with
`AGENT_CLI_CREDENTIAL_STORE=file` (the launcher branch without `--use-system-ca`).
The public `terminals()` API supplies those current foreground facts; the original
shell argv, process name MainThread and `reported` flag alone are insufficient.
The installer layout is an observed identity contract, not a promised cross-version
Cursor API. No home directory, version number, PID or address is hardcoded.

Only these interactive launch forms are claimed. Initial prompts, resume/list/status
subcommands, print mode, other flags and Windows executable layouts are excluded
from fallback discovery. The optional `--yolo` is not required or added by Herdboard.
There are no hook, wrapper, program-table or approval-setting changes.

The source requires a live/exact terminal, positive creation time and terminal/
foreground PIDs, the captured launcher/entry-point structure and an unambiguous
current pane → tab → space association. Full remote addresses remain intact.
Discovery reads reactive API facts synchronously, with no saved queue, screen
reads, new timer or async result to revive a departed process. Pinning reads
Herdr's `herdr.pinned` label. Genuine reported agents take precedence by address.

## Missing status and lifecycle policy

[Herdr status](https://herdr.dev/core/#status-from-the-source) belongs to the
program's OSC 7501 report. None of the recorded Cursor sessions supplied a usable
status. The fallback therefore uses a neutral **Status unavailable / Status
indisponível** group and a **Cursor CLI** title, with no inferred task, activity,
question, status age or stuck warning. It cannot answer Cursor approvals.

The optional fifth column disappears when empty; the narrow list uses a labeled
card and count. Filters, settled tabs, pins, owning-space counts and worktree
consumers share eligibility. Cursor discovery cannot force a blocked space.
Reported status replaces the fallback once; losing it restores the neutral card.
Exiting Cursor back to a shell or ending its terminal removes the discovered card.
Replacement/reassociation reads fresh metadata, and remembered reported task titles
are bound to terminal creation and terminal/foreground PIDs. Fallbacks ignore them.

The source exposes process lifetime, not a stable Cursor chat ID. Switching chats
inside one process keeps one neutral card and never borrows a previous chat's task.
In Herdr 0.1.14, native agent next/previous shortcuts still require model status;
direct card Open and Peek work without it. No activity or report-emission integration
is claimed for Cursor.

## Regression and native evidence

Before production edits, `node --test tests/cursor-runtime.test.js` failed with
`the running Cursor session must reach the board`. The same real-module harness
now covers discovery, negatives, explicit EN/PT status, exact local/remote action
addresses, ownership, filters, settled tabs, pin order, reported handoff, process
replacement/exit, title lifetime and bounded worktree consumers. It also verifies
that no question/startup/activity screen reads are scheduled for unknown status.
Reported Cursor handoff and mixed remote scenarios are simulated controls.

A fresh app home, core session, XDG state/runtime/config and authenticated Xvfb
display isolated native verification from the user's app and existing terminals.
The initial unauthed launch reached Cursor's login screen; later launches reused
the existing Cursor login through that process's XDG config, without copying
credentials. Only the temporary verification workspace was trusted. No model task
was sent. An observer mod captured real API data without altering reports or
production source. JSON captures substitute private local paths and host names; screenshots are unmodified.

The original board was also replayed in that native app with a real Cursor process:
[no card](evidence/issue-29/baseline-missing.png). The fixed board displayed one.

| Language and window | Card | Peek | Result |
| --- | --- | --- | --- |
| EN 1280×1000 | [frame](evidence/issue-29/en-1280.png) | [frame](evidence/issue-29/en-1280-peek.png) | Both navigations reached t4 |
| PT 1280×1000 | [frame](evidence/issue-29/pt-1280.png) | [frame](evidence/issue-29/pt-1280-peek.png) | Both navigations reached t4 |
| EN 760×1000 | [frame](evidence/issue-29/en-760.png) | [frame](evidence/issue-29/en-760-peek.png) | Both navigations reached t4 |
| PT 760×1000 | [frame](evidence/issue-29/pt-760.png) | [frame](evidence/issue-29/pt-760-peek.png) | Both navigations reached t4 |

Open started from a different tab. Peek started from that other tab and the native
`focused().terminal` became t4 in its overlay. Every matrix observation had no mod
errors. [Navigation results](evidence/issue-29/native-navigation.json) and the
[paired API snapshot](evidence/issue-29/native-app-snapshot.json) are recorded.
At 760px, existing tiny-header rules omit space-count text; the status chip shows 1.

Additional native captures verify [pinning](evidence/issue-29/native-pinned.png),
[This space](evidence/issue-29/native-this-space.png) hiding Cursor from another
space, [All](evidence/issue-29/native-all-spaces.png) restoring it,
[two sessions](evidence/issue-29/native-second-session.png) and
[return to shell](evidence/issue-29/native-process-exit.png) removing the second
card. Paired API JSON and [lifecycle results](evidence/issue-29/native-lifecycle.json)
record ownership and foreground changes. Terminating the earlier t2 session also
removed its card, leaving t4. Real remote navigation and actual Cursor report
handoff were not exercised; their command/ownership contracts are covered in the harness.

## Checks

`scripts/check.sh` is the complete project gate: all three native mod checks and
the full Node suite: **506 tests passed**, including **32 Cursor tests**. All
three mod checks passed. The new Cursor file also passes strict JavaScript typechecking
against generated API types with `--skipLibCheck`. The repository-wide generated
strict TypeScript configuration already fails on the base revision and remains
failing after this change, including generated declarations and existing JS
typing. It is not reported as a passing full-project typecheck.
