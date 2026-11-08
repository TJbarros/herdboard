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

Before the P2 follow-up below, `scripts/check.sh` passed all three mod checks and
164/164 Node tests. JavaScript typechecking passed with the generated host declarations:

```sh
npm exec --yes --package=typescript -- tsc --allowJs --checkJs --noEmit \
  --target es2023 --module es2022 --moduleResolution bundler --lib es2023 \
  --skipLibCheck --strictNullChecks false --noImplicitAny false \
  mods/herdboard/ask.js mods/herdboard/main.js mods/herdboard/gpui-kit.d.ts
```

Antes da correção P2 abaixo, `scripts/check.sh` passou nos três mods e em 164/164
testes Node. A checagem de tipos JavaScript acima também passou; ela não exige
tipagem de parâmetros implícitos.

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

### Put-away tab regression / Regressão de aba guardada

The P2 review scenario was reproduced before the fix: the startup cache had both
`visible` and `choices`, but its tab remained `settled`, so the card and header
count excluded it. Clearing only `settled` displayed the same cached request.
Startup discovery has no OSC report to trigger the core's automatic return.
First recognition now calls `tab.unsettle` for the source's current tab, without
focusing it. Recognition survives polling and missing screens within that lifecycle.

Regression tests render the real mod through the simulated runtime. They cover a
split tab put away by another agent's card before trust appears, the header count,
unchanged unrelated tabs, rejected screens, late reads from ended lifecycles, a
pane moving tabs during a read, repeated polls after another Put away (answered or
unanswered), and a new foreground process returning the tab again. This P2 scenario
was not rerun in the real Herdr UI; the real-app checks below predate this fix.
After the fix, `scripts/check.sh` passed all three mod checks and 173/173 Node tests.

O P2 foi reproduzido antes da correção: `visible` e `choices` estavam presentes,
mas a aba continuava `settled`, excluída do quadro e do cabeçalho. Limpar apenas
esse estado fez o mesmo pedido aparecer. Como não há report OSC nessa descoberta,
o core não provocava o retorno. O primeiro reconhecimento agora chama
`tab.unsettle` na aba atual da fonte, sem mudar o foco. O reconhecimento persiste
entre leituras e telas temporariamente ausentes no mesmo ciclo do processo.

Os testes cobrem o fluxo com dois painéis, o clique em Guardar no outro agente,
o diálogo posterior e a contagem do cabeçalho, além dos casos acima. A regressão
foi validada no runtime simulado; as verificações reais abaixo são anteriores a
esta correção e não validam esse cenário específico.
Após a correção, `scripts/check.sh` passou nos três mods e em 173/173 testes Node.

### Wrapped explanation and invalidated reads / Explicação quebrada e cache invalidado

Both follow-up P2 findings were reproduced with failing tests before their fixes.
The native Claude Code 2.1.319 capture at 48 columns is stored in
`tests/fixtures/workspace-trust-narrow.txt` (captured through tmux, folder redacted).
Changing only the explanation's line break in the 200-column fixture also made
recognition fail: the parser compared that explanation to one exact line.
It now joins the known question and explanation for comparison and retains every
raw dialog line in the id. Tests verify discovery, header counts, cursor answers,
PT/EN controls, rejection of altered/incomplete explanations, and rejection of an
answer when wrapping changes between discovery and validation.

The second reproduction clicks an answer, then Put away on another agent in the
same split tab while validation is pending. A failed validation deleted the read
cache, including its recognition flag. The next poll had the identical lifecycle
key and dialog id but called `tab.unsettle` again. Recognition now lives separately
from invalidatable reads and is cleared when the source lifecycle ends. Tests
exercise failures in the initial metadata read, screen read and final metadata
read; the same request stays put away, sends no keys, and a new process can still
return its tab to the board.

Repro commands (failed before the respective fix, pass after):

```sh
node --test --test-name-pattern='wrapped explanation|48-column trust' tests/ask.test.js tests/startup.test.js
node --test --test-name-pattern='failed answer validation preserves' tests/startup.test.js
```

After both fixes, `scripts/check.sh` passed all three mod checks and 183/183 tests.
A fresh isolated Herdr home/core and authenticated Xvfb display were used for the
real UI check: inspected PT and EN at 760×900 and 1280×820, with two terminal panes.
The narrow pane was 38 columns; its wrapped explanation produced an answerable
card and Needs you count. Wide frames also showed the space count. Native screenshots
are under `/tmp/herdboard-p2-ui-vdb7s1ts/`. A fresh terminal was used for the final
wide check: resizing the first terminal left an old separator above the dialog,
which the existing strict complete-screen guard rejects. These checks do not
establish uninterrupted recognition across such resize residue. The asynchronous
validation failure/Put away race was verified in the simulated runtime, not by
injecting a core failure in the real app. Clicking No on the native card exited
Claude and cleared the card and counts; the app reported no errors.

Os dois P2 seguintes foram reproduzidos com testes falhando antes das correções.
A captura nativa em 48 colunas foi obtida via tmux e salva com a pasta ocultada.
Quebrar apenas a linha da explicação na captura larga já fazia o reconhecimento
falhar, pois ela era comparada com uma única linha exata. A comparação agora junta
a pergunta e a explicação conhecidas, mantendo todas as linhas brutas no id.

No segundo caso, o teste clica numa resposta e depois em Guardar no outro agente
da mesma aba dividida, enquanto a validação está pendente. A falha apagava o cache
e seu reconhecimento; a próxima leitura tinha o mesmo ciclo e id, mas desfazia
Guardar. O reconhecimento agora fica separado do cache invalidável e termina com
o ciclo da fonte. Os testes cobrem falhas nas três etapas de leitura: o pedido
atual continua guardado e sem enviar teclas; um novo processo ainda retorna a aba.

Os três checks de mods e os 183 testes passaram. A interface real foi inspecionada
num home/core/display isolado, em PT/EN, a 760×900 e 1280×820. O painel estreito
tinha 38 colunas e mostrou card respondível e contagem mesmo com a explicação
quebrada. Para a verificação larga final foi usado outro terminal: redimensionar
o primeiro deixou uma regra antiga acima do diálogo, rejeitada pela validação
estrita já existente. Portanto, a continuidade do reconhecimento com esses resíduos
não foi validada. A corrida entre falha assíncrona e Guardar foi validada no runtime
simulado, sem injetar falha no core real. O clique em Não no card real encerrou o
Claude e limpou o card e as contagens; o app não reportou erros.

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
