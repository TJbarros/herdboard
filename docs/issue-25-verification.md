# Issue #25 verification

2026-11-09 · isolated Linux native app / core · herdr-app 0.1.14 · hc 0.1.19 ·
Node 24.22.1. The primary app home and installed official mods were not modified.
Connection data and mixed-machine screenshots remain private, outside the repository.

## Supported activity

Activity is read from the visible terminal screen, independently of task titles and
blocked questions. Only the captured configurations below are eligible. These are
verification settings, not a recommendation to change an existing permission policy.
The model API does not expose the installed binary version; versions identify the
captures and do not establish support for every release with similar output.

| Agent | Effective foreground configuration | Recognized activity |
| --- | --- | --- |
| Claude Code 2.1.319 | `claude --permission-mode bypassPermissions`; Opus 5.5 high, existing custom hooks/status line | Running tool label when its elapsed timer and `$` command are adjacent to the live phase; otherwise the original live phase, such as `Sublimating…` |
| Codex CLI 0.167.0 | `codex --no-daemon --no-alt-screen --ask-for-approval never --sandbox workspace-write`; GPT-6.1-Sol xhigh; also the captured launch with one initial positional task | Original `Working` phase, including second/minute elapsed forms; this captured UI does not expose a more descriptive current action |
| pi 0.85.1 | Existing installed launcher; no usable model/provider configured | Unavailable: startup and submitted-task error did not report an agent; no status was fabricated and no credentials were added |

Claude extraction requires the captured spinner/elapsed form, empty prompt between
separators, and trailing permissions footer. A tool label additionally needs the
current timer and command immediately before that phase; intervening transcript
output disqualifies the label. Codex requires its live interrupt indicator, prompt
and model footer. Submitted prompts, completed phases, isolated history, keyboard
hints, incomplete screens and other configurations retain the neutral fallback.

The captured phases are intentionally narrow. Claude has further spinner/elapsed
variants and custom footers, and Codex has other models/configurations; these are
not asserted as supported. A recognizable original tool label can be truncated in
the card; its entire text is in the activity tooltip, in both board presentations.

## Versioned native evidence

Only disposable local sessions are included under
[`tests/fixtures/activity`](../tests/fixtures/activity):

- `claude-code-2.1.319/working-wide.*`: 148×33 cells, active Bash sleep with original
  Portuguese tool label, command and `Infusing…` phase.
- `claude-code-2.1.319/working-narrow.*`: 82×33 cells, active prompt-submit hook and
  `Sublimating…` phase. `tool-narrow.*`: 82×33, synchronous Python sleep, timer,
  command, background shortcut and `Generating…` phase.
- `codex-0.167.0/working-wide.*` / `working-narrow.*`: 148×33 and 82×33 cells,
  active harmless sleep, `Working` phase and interrupt indicator.
- `codex-0.167.0/initial-task-wide.*` / `initial-task-narrow.*`: 148×33 and 82×33,
  genuine Herdr launch with its first task in argv and minute-scale elapsed progress.
- `pi-0.85.1/unavailable-*` / `error-wide.*`: startup/no-model and submitted-task
  errors, without a reported agent. The wide startup is 148×30; narrow is 82×33.

Each text screen is paired with `hc get` metadata. Captures use `--lines 0` and
preserve the original text. Negative tests also derive deliberately incomplete or
historical screens from these fixtures; those transformations are simulated cases.
Native app snapshots confirmed the split `status`/`report` model and availability
of `created_ms`, terminal/foreground PIDs and argv, foreground cwd, `turn` and the
agent's independent `seq`. A later native turn changed while the process persisted.
`seq` is used conservatively to invalidate report changes, never equated to `turn`.
Full native observer snapshots are private and are not versioned.

## Polling and lifecycle

Only the cards instance polls shown Working consumers, respecting filters, Put away,
hidden board ancestors and expanded/different layouts. Activity reads use the full
terminal address, including a remote qualifier. Missing terminal metadata and
unsupported launches do not originate reads. Header, menu, pane and rail originate
none. Existing startup and blocked-question reads retain their separate budgets.

The minimum cooldown is **5000ms after completion**, checked by a one-second timer
and renders. There are **2 physical activity slots globally** and **1 per address**.
No queue survives outside the current consumer map. Slow reads retain their slot;
logical lifecycle invalidation never creates another physical read for that address.
Failures clear activity and use the same cooldown; cached text expires at **10000ms**.
Changes of status, turn, terminal, foreground, report revision, association or visible
consumer invalidate previous text and late results. Activity is transient and never
written to the persisted task-title cache.

## Native load measurements

Temporary instrumentation in the isolated board recorded attempted activity reads
immediately before `hc`, with completion time/code afterwards. Measurement artifacts
were kept outside the repository. These are actual native API reads, not a shell-only
latency probe. Workload: one then four disposable local Codex sessions performing
harmless sleeps, same scratch worktree, board visible, current-space filter, Idle
open; 1280×1000 window / 1236px board. The four-agent column scrolled normally.

| Native workload | Observation | Attempts / completed | Rate | Latency min / median / p95 / max | Peak physical concurrency | Minimum completion cooldown |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Working agent | 41.942s | 8 / 8, 0 errors | 0.191/s | 11 / 39.5 / 65 / 65ms | 1 | 5008ms |
| 4 Working agents | 38.469s | 28 / 28, 0 errors | 0.728/s | 12 / 56 / 278 / 397ms | 2 | 5004ms |

The five-second cooldown kept the native workload below one activity request per
agent per five seconds; two slots bounded simultaneous reads while retaining headroom
for card updates. These samples establish local native behavior for this workload;
they do not measure remote transports, large agent fleets or a global cap that includes
startup/question reads. Instrumentation was temporary and is absent from production.

## Test evidence and remaining validation

TDD records are outside the repository at
`/tmp/herdboard-issues-25-27/evidence-25`: numbered red/green pairs cover the neutral
line, native extraction, historical rejection, interval/address handling, stalled-read
expiry, live tool labels and the initial-task launch shape. Lifecycle and limit checks
count every attempted read, including failed and obsolete reads. Twenty simulated
consumers exercise the two-slot ceiling, address exclusion, repeated renders, queue
pruning and completion order. Other runtime cases cover process/terminal/turn changes,
all visibility gates, missing metadata, rejection and nonzero results, expiry and a
full-text tooltip with long original activity. These simulated checks do not establish
native remote performance or rendered font metrics.

`scripts/check.sh` passed before integration; the integration coordinator records the
final combined check and native PT/EN viewport matrix at 1280, 1024 and 760px. Native
activity-only viewing at 1280 confirmed the third line, retained status age and scrolling;
combined Git/machine sizing and hover checks belong to that final matrix. Older usage
images predate this extra line. No private mixed-machine screenshot is committed.
