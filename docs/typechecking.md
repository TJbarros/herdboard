# Typechecking Herdboard

[Português](typechecking.pt-BR.md). Diagnosis recorded 2026-11-09.

Install development dependencies with `npm ci`, then run `scripts/check.sh`.
This complete gate generates Herdr's native declarations with each mod check,
runs the strict compiler for all three mods, and runs the Node suite. Once native
declarations exist, `npm run typecheck` checks types alone. TypeScript is pinned
to 5.9.3 in the lockfile; `node_modules` is not installed into the user's app.

## Diagnosis

At commit `48a128e`, the board's generated configuration reported **387 source
errors**, and the menu/picker also failed their independent checks. The initial
issue #29 gate did not run the compiler, so passing it did not establish a passing
typecheck. A failing gate regression now reproduces that omission.

Three focused probes separated the causes:

1. Selecting the ES2023 library removed `findLast` / `findLastIndex` diagnostics.
   The versioned `tsconfig.json` files now describe those already-used runtime
   APIs, explicitly preserving the existing Herdr-generated compiler settings.
2. Declaring the actual palette shape removed invalid `{}` property accesses and
   exposed the native color contract: Herdr's general string map must be narrowed
   to GPUI's `#...` color type before building elements.
3. Explicit parser, worktree, board-state and callback contracts removed implicit
   parameters, ambiguous option arrays, dictionary accesses and callback tuples.
   Discriminated parser results and picker rows describe their actual variants.

No application file uses `@ts-ignore`, `@ts-nocheck` or an `any` escape hatch.
Existing strict compiler settings are preserved, including Herdr's lifecycle
choice of `strictNullChecks: false`; no diagnostic switch was weakened to obtain
a pass. The versioned settings explicitly preserve the generated `jsconfig`'s
previous TypeScript default of skipping dependency declaration validation. This
policy is unchanged: application JS and the authored `types.ts` are checked.
Upstream `gpui-kit.d.ts` and any old local `jsconfig.json` remain ignored and
unedited; typechecking does not depend on a local `jsconfig.json`.

The clean-copy regression is necessary because Herdr does not generate a
`jsconfig.json` when a `tsconfig.json` already exists. Every mod therefore has a
complete configuration, rather than extending an ignored local file.

## Interfaces and runtime data

`parseAsk` and `WorktreeChanges` retain small interfaces with explicit results and
their existing behavioral tests. Board contracts live in authored `types.ts`, not
in edits to native declarations. At the native-data seam, the board's
`herdr-state.js` adapter validates terminal, report, program and theme fields.
Unavailable optional facts remain absent; partial permission reports retain their
supported meaning. Remembered titles and cached menu entries are validated before
use. The picker validates machine replies, saved colors and numeric zoom.

Herdr checks each mod as an isolated application and rejects runtime imports from
a sibling mod. Small theme/data adapters therefore remain local to each mod;
there is no cross-directory runtime dependency or new installation prerequisite.

## Regression checks

- The existing permission, startup, Cursor, activity, worktree and ownership tests
  protect runtime behavior while type contracts change.
- Complete-gate tests require a failing typecheck to return failure, continue
  checking the remaining mods, and still run Node tests. A missing development
  compiler also fails with the `npm ci` setup instruction.
- A real-compiler test excludes the ignored local configuration, accepts a
  temporary copy of the board, then adds
  `div().text_color("red")` only to that copy. It requires TS2345 and a nonzero
  compiler exit, proving that native-call errors are checked rather than hidden.

Native mod checks and the EN/PT narrow/wide board and navigation recheck use an
isolated app/core/display. Native menu and picker checks cover their own module
directories, including Herdr's runtime import restriction.

The final complete gate passed all three native checks, all three typechecks and
**509 tests**. The same gate also passed from a clean archive of the tracked
tree, initially without generated declarations or local configs. Herdr generated
all three declaration files and no `jsconfig.json` was needed. [Recorded results](evidence/typechecking/checks.json) and the
[four navigation observations](evidence/typechecking/native-navigation.json)
include the real-compiler negative check. Native frames:
[EN wide](evidence/typechecking/en-1280.png),
[PT wide](evidence/typechecking/pt-1280.png),
[EN narrow](evidence/typechecking/en-760.png),
[PT narrow](evidence/typechecking/pt-760.png),
[new-tab menu](evidence/typechecking/new-menu-pt-760.png) and
[picker](evidence/typechecking/picker-pt-760.png).
