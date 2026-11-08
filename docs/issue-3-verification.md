# Issue #3 verification / Verificação

2026-11-08 · Linux · herdr-app 0.1.13 · hc 0.1.18 · Claude Code 2.1.319.

## Source and scope / Fonte e escopo

The maintainer explicitly approved restricted startup discovery during implementation.
This is a separate terminal-dialog source, not a fabricated OSC permission report.
`terminals()` preserves the core's terminal metadata; `panes()` and `spaces()` locate
its registered pane. Eligibility and lifecycle are documented in [RECIPE.md](../RECIPE.md).
The displayed folder must match the foreground process cwd. Other programs,
unreported terminals without the complete recognised dialog, and unknown menus are
not promoted to answerable cards. The header receives recognised lifecycle keys;
only the board copy reads screens.

O mantenedor aprovou explicitamente a descoberta inicial restrita durante a implementação.
É uma fonte de diálogo de terminal separada, sem fabricar reports OSC. A pasta exibida
deve coincidir com a pasta do processo em primeiro plano. Outros programas, telas
incompletas e menus desconhecidos não ganham cards respondíveis. Só a cópia do quadro
lê as telas; o cabeçalho recebe as identidades reconhecidas para sua contagem.

Contracts checked:

- [Herdr status comes from OSC 7501](https://herdr.dev/core/#status-from-the-source).
- [Herdr terminal, pane and agent APIs](https://github.com/herdrdev/herdr-app/blob/7fe7ac34fef8a3ee76cb5d2f17bc8d6331e50bd8/defaults/herdr.d.ts).
- [Terminal snapshots preserve metadata and add program/report](https://github.com/herdrdev/herdr-app/blob/7fe7ac34fef8a3ee76cb5d2f17bc8d6331e50bd8/src/window.rs#L2007).
- [Claude settings-file hooks wait for workspace trust](https://code.claude.com/docs/en/hooks#workspace-trust).
- `hc schema` on the installed 0.1.18 exposes creation time, terminal PID,
  foreground PID/argv/cwd, `reported`, state and status. `hc get <t> --json`
  supplies these before an agent has reported anything.

## Automated checks / Verificações automatizadas

Failing tests were added before parser recognition, startup card discovery, each
cursor/target plan, core revalidation, continued discovery, cursor tooltips and header
integration. The parser boundary uses the complete 200-column capture in
`tests/fixtures/workspace-trust.txt`, with only the folder redacted. The answer tests
render the real mod with the Herdr/GPUI boundary replaced by `tests/runtime/`.

Tests cover all four cursor/target combinations, rejected partial/ambiguous dialogs,
full raw identity, changed folders/options/order/cursors, source changes around
asynchronous reads, cache replacement, stale buttons, duplicate clicks, failures,
filtering/polling after an answer, and unchanged numbered Yes/No/More behaviour.
These mocked tests do not establish real startup reachability by themselves.

Final local checks: `scripts/check.sh` passed all three mod checks and 164/164 Node
tests. JavaScript typechecking passed with the generated host declarations:

```sh
npm exec --yes --package=typescript -- tsc --allowJs --checkJs --noEmit \
  --target es2023 --module es2022 --moduleResolution bundler --lib es2023 \
  --skipLibCheck --strictNullChecks false --noImplicitAny false \
  mods/herdboard/ask.js mods/herdboard/main.js mods/herdboard/gpui-kit.d.ts
```

`scripts/check.sh` passou nos três mods e em 164/164 testes Node. A checagem de tipos
JavaScript acima também passou; ela não exige tipagem de parâmetros implícitos.

Os testes verificam reconhecimento, os quatro planos de teclas, identidade completa,
mudanças durante leituras assíncronas, fontes inelegíveis, cache substituído, cliques
antigos ou duplicados, falhas e persistência do bloqueio após filtros e novas leituras.
Os testes numerados existentes continuam verificando Yes/No/More. Os mocks não
comprovam, sozinhos, a descoberta real do diálogo inicial.

The independent Standards review reproduced one bypass in the simulated runtime:
the trust screen could use the reported-permission path without startup metadata
checks. A failing regression was added, then cursor answers were restricted to the
startup source both when selecting controls and when revalidating a click. The Spec
review found no additional actionable issue.

A revisão independente de padrões reproduziu no runtime simulado um desvio pelo
caminho de permissões reportadas. Após teste de regressão falhando, respostas por
cursor foram restritas à fonte inicial, tanto nos controles quanto na validação do
clique. A revisão da especificação não encontrou outro problema acionável.

## Real Herdr run / Execução real no Herdr

Used a private authenticated Xvfb display, a fresh `HERDR_APP_HOME`, an isolated
`HC_SESSION` / `XDG_STATE_HOME`, and a fresh temporary workspace. Installed this
checkout into that app home and opened a labelled test space running Claude.
The real personal app/core were not used for this UI run.

1. `hc get` confirmed the trust screen's foreground process was `claude`, while
   `reported` was false, `status` was null and `turn` was 0.
2. The board displayed an answerable Needs you card, its folder and Yes/No, plus
   Open and answer and Peek. The space count was 1. No reported agent existed.
3. Inspected native `herdr-app shot` frames at 1280×820 and 760×900 in PT and EN.
   The answer controls and waiting time stayed within the card. The No tooltip
   read `Confirma no terminal: "No, exit"`, with no invented shortcut.
4. Sent `hc keys <test-terminal> down`, moving selection to Yes without accepting it.
   After the board refreshed, clicked No on the real card. Claude exited to bash,
   the card disappeared and the space/Needs you counts cleared. The trust-dialog
   text remained in terminal history without becoming a new card.

Na execução real isolada, o diálogo apareceu no card antes de qualquer status.
Foram inspecionadas as quatro combinações de idioma e tamanho acima. Com Yes
selecionado, o clique em Não no card encerrou o Claude e voltou ao bash; o card e
as contagens foram limpos, mesmo com o texto antigo ainda no terminal. A pasta
não foi aceita como confiável nessa verificação. A aceitação de Yes foi coberta
pelos testes dos botões, não por aceitação de confiança no teste real.

## Limits / Limites

Recognition targets the captured wording/structure, not a promised Claude rendering
API. Only the native Claude foreground executable was exercised on Linux; other
launchers/platforms and other cursor dialogs were not verified. As with existing
numbered answers, screen reading and key sending are separate core operations:
there is no atomic compare-and-send contract, so a change after the final check
and before the key cannot be ruled out by screen comparison.

O formato reconhecido é o capturado, sem promessa de estabilidade da interface do
Claude. Outros lançadores, plataformas e diálogos não foram verificados. Leitura e
envio de teclas são operações separadas: uma alteração após a última conferência
e antes do envio continua sendo um limite do contrato do core.
