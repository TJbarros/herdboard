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
verification. Their corrections and the final full-suite result are recorded after
the review-fix integration; native evidence above remains distinct from simulation.
