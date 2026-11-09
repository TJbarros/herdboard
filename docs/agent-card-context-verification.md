# Integrated agent-card verification

[Português (Brasil)](agent-card-context-verification.pt-BR.md)

2026-11-09 · issues #25–#27 · base `7beaeb4` · herdr-app 0.1.14,
hc 0.1.19, Node 24.22.1, Git 2.43.0.

## Environment and privacy

Used an isolated app home, core session and X11 display. Genuine disposable Claude
Code and Codex sessions supplied their own reports; no agent status was fabricated.
The existing remote transport was reused from the disposable core. The user's app
configuration, remote registration and project files were not modified.

Real connection names, addresses, identifiers, paths, configuration and screenshots
remain outside the repository. Mixed-machine evidence was inspected privately;
this record contains aggregate results only. Versioned local snapshots describe
disposable sessions, and simulated remote fixtures are explicitly synthetic.

## Native layout

Installed the combined activity, Git and machine implementation. Temporary
instrumentation recorded only the dimensions from the existing size callback;
layout and query logic remained the implementation under test. The one-pixel
observer and layout borders explain why board width differs from window width.

Each row was inspected in **English and Portuguese**, with Idle open. Both All and
This space were exercised. Screenshots were inspected but are intentionally private.

| Window | Actual board width | This space board height | All board height |
| --- | --- | --- | --- |
| 1280 × 1000 | 1231 px | 269 px | 358 px |
| 1024 × 1000 | 975 px | 269 px | 358 px |
| 760 × 1000 | 711 px | 358 px | 358 px |

- Working, blocked, Done and Idle entries appeared together in the initial local
  matrix. Working activity, status age, machine label and the expected two-file
  disposable worktree count were visible without overlapping controls.
- At 1024 px, hover actions remained accessible; truncated location/age text retained
  its tooltip. At 760 px, the compact list scrolled to Done and Idle entries, whose
  worktree total and machine label remained visible in both languages.
- The private mixed view identified each remote owner and the local owner, including
  when This space selected the local space. Switching All / This space preserved the
  intended entries. There were no native mod errors in the twelve captured states.
- A generated 32-character display alias, changed only in the disposable client,
  truncated in its badge and appeared completely in the English and Portuguese
  tooltips. Requalification of the live IDs updated the displayed ownership.
- Removing that disposable remote registration removed the remote entries and
  restored the local-only presentation without machine badges. The original
  client's registration remained unchanged.
- A real foreground Claude tool supplied a long activity label. The card truncated
  it, while both language views exposed its complete original text in the tooltip.

The harness separately checks exact focus, Peek, Pin, Unpin and Put away targets.
No remote agent interaction was used as a substitute for those deterministic checks.
Physical network loss and remote permission dialogs were not recreated natively;
their unavailable/stale-result paths are covered by the controlled runtime tests.

## Query evidence

- [Activity evidence](issue-25-verification.md): real wide/narrow captures establish
  the supported Claude/Codex formats; the tested pi configuration remains
  unavailable. One and four real Working agents measured the five-second completion
  cooldown and peak activity concurrency of two.
- [Git evidence](issue-26-verification.md): real Git tests establish record counting;
  native execution preserved NUL, tab and newline characters. Output above 8 MiB
  was silently truncated with success, so the implementation rejects capped output.
  Native load used synthetic consumers with real Git execution, separately from
  real-agent activity measurements. Private remote execution returned the expected
  disposable fixture without a local fallback.
- [Machine evidence](issue-27-verification.md): reactive full-ID ownership and exact
  action routing are tested through the real mod; native mixed layout was inspected
  privately as described above.

## Integrated checks

The independent Standards and Spec reviews both reproduced the Git ancestor-visibility
and deferred-dispatch defects. Standards also requested paired Portuguese activity
verification. One fresh implementer corrected all three findings with failing tests
before the runtime changes. New cases include dispatch without an intermediate
render, removed/changed consumers, canceled reservations, physical slots and the
cooldown measured from actual dispatch.

At `63b729d`, `scripts/check.sh` passed all three mods and **471 tests**, with zero failures,
skips or cancellations. That integration has identical runtime/test content to
that full check. The 78 focused activity/Git/machine tests and the mod check passed
again after the merge. Both independent visibility reproductions now attempt zero
Git commands, where the reviewed implementation attempted one.

The final modules were installed into the isolated app without instrumentation.
Their hashes match the integration, the expected disposable count remained visible,
and the app reported no mod errors. No new media or real connection identifiers
were included in the final change. Native evidence above remains distinct from the
controlled runtime tests.

## PR #28 refinement

A fresh Spec review reproduced an activity read before the board received positive
native height: the original reproduction attempted one read at height zero, while
Git correctly attempted none. Commit `1586738` requires positive height when selecting
activity consumers, including before deferred dispatch and after completion.

The regression first failed with one unexpected read. It now passes with zero,
using the real `on_size_change` callback. Additional cases cover loss of height,
late results, deferred dispatch without another render, cooldown and recovery.
The independent rereview passed all **81** focused activity/Git/machine tests;
`scripts/check.sh` passed all three mods and **474 tests**, without failures,
skips or cancellations. Standards and runtime Spec reviews found no remaining
actionable issues in `1586738`.

The earlier native matrix records the renderer before this eligibility correction;
the correction does not change the card layout. Supplemental native measurements
through the corrected real board are recorded separately below.

### Supplemental native Git measurements

The rereview also required full-board native measurements beyond the earlier
synthetic-consumer scheduler samples. Four genuine local Codex processes were
measured through `main.js` in three 24-second windows: one shared worktree,
four separate worktrees and a 10,000-file worktree. All four consumers received
the expected one-file total in each scenario. Physical peaks were 1 / 2 / 1;
minimum repeated status intervals were 10017 / 10049 / 10016 ms.

[The Git record](issue-26-verification.md#native-board-load-with-genuine-agents)
contains rates, latencies, dimensions, workload, source hashes, raw attempted
commands and observer details. Production modules were restored without
instrumentation, passed the mod check and reported no native errors. The final
private frame contained the onboarding overlay; this load run establishes query
execution and runtime-observed labels, while the earlier native matrix establishes
unobstructed PT/EN layout. The test app/core/display were closed and the user's
configuration was preserved.
