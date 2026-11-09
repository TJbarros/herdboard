# Issue #27 verification

Date: 2026-11-09. Runtime: herdr-app 0.1.14, hc 0.1.19, Node 24.22.1,
Git 2.43.0, Linux. The app used an isolated app home and core; the default app
home and official mods were not changed.

## Native observations

[The minimal API snapshot](evidence/issue-27-local-association.json) comes from
the running app's real `agents()`, `spaces()`, `panes()`, `terminals()` and
`machines()` APIs. Claude Code and Codex genuinely reported their own statuses;
no status was fabricated for this evidence.

Both agents' `space` values match the local space's full `id`. That space reports
`machine: null`. Each agent's `pane` matches a pane whose `terminal` is the same
full agent address and whose `tab` is in that space. The refreshed `herdr.d.ts`
defines machine ownership on `SpaceInfo`, while `AgentInfo` provides `space`,
`tab`, `pane` and `address` without a machine field. The implementation follows
that association independently of the active space.

Generated files were read from the isolated 0.1.14 app after startup. SHA-256:

- `herdr.d.ts`: `814d0115fbf97638ff030fde8ea2836710244d3093ebc28aa56f696d6dc34e03`
- `AGENTS.md`: `2746eae21ff702f8077177ec5e9be9948dedbf881c45eaad82811ffe11f83e26`

Only the scratch-local machine was present in this initial snapshot (`name: null`,
`layout: ready`). This snapshot establishes no remote behavior. Native
simultaneous local/remote demonstration, remote disconnection/reassociation,
full long-name tooltips and mixed-machine layout/actions at window widths
1280, 1024 and 760 px are validated separately by the coordinator. Their final
aggregate outcomes may be recorded here without publishing private machine names,
addresses, identifiers, paths, configuration or screenshots. Actual remote data
stays outside the repository. The simulated viewport inputs below do not
establish native wrapping or clipping.

## Simulated real-main.js runtime tests

`node --test tests/machines.test.js` loads the real mod through the existing
Herdr/GPUI boundary adapters. The nine scenarios cover:

- Local-only presentation and reactive addition of remote spaces.
- Missing/invalid, reassigned and disappeared owning spaces and removed agents.
- Localized visible Idle rows and folding without extra entries.
- Blocked cards and the single compact list, including compact Idle entries.
- Full-ID All / This space filtering and navigation with identical display names.
- Exact focus, Peek, Pin, Unpin and Put away arguments for `t1` and `build/t1`.
- Unavailable remote ownership without an added `hc machine` query across ticks.
- Original long names and complete PT/EN tooltips at simulated board widths
  1236, 980 and 716 px; these are inputs, not measured native layout evidence.
- Recognized startup cards, full pane/tab/space links and exact Unsettle targets.

Four vertical red/green slices first failed on missing mixed-machine, unknown,
Idle and blocked-card labels, then passed after their corresponding implementation.
Filter/action/startup cases preserve behavior already supported by the baseline,
so those regression guards passed without identity changes. The external execution
logs are under `/tmp/herdboard-issues-25-27/evidence-27/`; they are session artifacts,
not a portable native evidence bundle.

Run `scripts/check.sh` for all mod checks and the full Node suite. Those checks do
not lay out mixed-machine cards in a native app. The coordinator records final
integrated suite results and native local viewport checks separately.
