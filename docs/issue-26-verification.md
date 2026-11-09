# Worktree change totals: verification

Verified on 2026-11-09. These totals describe pending Git file records in the
terminal's worktree, including changes made by anyone. They do not attribute work
to an agent. Real remote connection details and captures remain private and are
excluded from this record and its artifacts.

## Real Git and controlled runtime tests

`tests/git-changes.test.js` executes Git against disposable repositories. It
covers clean/unborn repositories, whole-worktree totals from a subdirectory,
individual untracked files, ignored files, tabs/newlines in filenames, staged and
unstaged changes in the same file, deletion, staged addition, type changes,
recognized rename versus an unstaged deletion/new-file move, conflicting merges,
user settings hiding untracked files/disabling renames, non-Git and missing paths.

`tests/git-runtime.test.js` runs the real `main.js` with controlled Herdr and UI
boundaries. Every attempted exec is recorded, including discovery and failures.
It checks exact cwd/machine routing, shared discovery/status, distinct machines
and linked-worktree identities, same-millisecond terminal replacement, stale
directory/machine responses, no local fallback, successful zero versus failure,
two physical slots through slow requests, minimum retry intervals across hiding,
filters/Put away/folded Idle, auxiliary roles, zero-height visibility, compact
Idle and paired wording. These are simulated runtime checks, not native UI proof.

The agreed public seams were Git-result interpretation with real repositories and
the real-main.js runtime harness. Red/green slices were recorded before adding the
helper, the cap guard, card querying, terminal revisions, hidden retry cooldowns,
Git type changes and the positive-height gate. Raw failure/pass logs remain in the
session's temporary evidence bundle. The full `scripts/check.sh` passed all three
mod checks and the Node suite; the coordinator records the final combined suite
after integrating the other card changes.

## Native execution API

The isolated Herdr app's actual `exec` API preserved NUL, tab and newline output.
A disposable local fixture returned five Git records, including MM and a rename;
querying its root and a subdirectory returned identical output. Missing commands
rejected, exit 7 remained exit 7, and stderr was preserved.

The native API silently truncated **each stream at 8 MiB** while returning exit
zero: a 9 MiB stdout lost its trailing sentinel, and 9 MiB stderr was capped while
a valid small stdout survived. The implementation rejects output whose combined
UTF-8 byte count reaches the cap, conservatively rejecting some large combined
outputs as well. Ending at a complete NUL record is insufficient proof of a total.

A separate real remote transport check returned the same five-record disposable
fixture with preserved NUL/special filenames and exit zero in **93 ms**. This
proves native remote exec routing/transport for that fixture. It is separate from
remote board rendering; no real connection names, identifiers, paths, configuration
or screenshots are included here.

## Native execution load with synthetic consumers

These measurements use the production `WorktreeChanges` scheduler and actual
Herdr `exec` calls against disposable local Git repositories. The consumers are
synthetic demand records, not 40 launched native coding agents. Each repository
has one modified tracked file; the larger fixture has 10,000 tracked files.
Raw command timings, totals and the measured source hash are in
[`native-exec-load.json`](evidence/issue-26/native-exec-load.json).

| Synthetic demand | Duration | All commands | Rate | Latency min / median / max | Peak physical exec |
| --- | --- | --- | --- | --- | --- |
| 40 consumers, one 20-file worktree | 22.112 s | 4 | 0.181/s | 15 / 16.5 / 77 ms | 1 |
| 8 consumers, eight 20-file worktrees | 22.161 s | 32 | 1.444/s | 15 / 16 / 96 ms | 2 |
| 40 consumers, one 10,000-file worktree | 22.152 s | 4 | 0.181/s | 37 / 75 / 96 ms | 1 |

Every final consumer saw one file. Shared-worktree cases each used one discovery
and three status commands. Eight distinct worktrees used eight discoveries and
24 statuses. This supports the **10-second minimum interval**: repeated status
work stays near 0.1 command/s per shared worktree after discovery, while the
observed larger-worktree calls took up to 96 ms. The **two-command ceiling** bounds
distinct-worktree fan-out and includes discovery. Both are limits, not latency
guarantees for arbitrary repositories or remote machines. Physical requests retain
their slots until settlement; no logical timeout creates duplicate work.

## Native board scope

The coordinator owns the final native local/remote board checks at 1280, 1024 and
760 px after merging activity and machine presentation. This ticket's native exec
measurements do not establish card geometry, real-agent fan-out, remote board
rendering or the final combined UI. Those results must be recorded separately.
