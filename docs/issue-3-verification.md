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

### Folder named Security guide and startup waiting age / Nome da pasta e idade da espera

Both review findings were reproduced with failing tests before their fixes. P2's
minimal input replaces only the wide fixture's folder with `/a/` followed by a
`Security guide` row. The real mod then showed no card or header count and left
the tab put away. Replacing only that name with `Security other` restored parser
recognition. A fresh native Claude Code 2.1.319 capture at 24 columns reproduced
the same failure, with two separate `Security guide` rows. It is stored in
`tests/fixtures/workspace-trust-folder-guide-24.txt`; the temporary directory was
replaced with equal-length text, preserving every row's length and wrapping.

The cause was selecting the first guide marker before locating the prose/folder
split. `parseAsk(screen, cwd)` now locates the complete known question and
explanation before selecting their following guide. Tests require the exact cwd,
complete structure and unchanged raw identity, restore the put-away tab and
header count, exercise both cursor answers, and reject a changed raw screen
before sending keys. The original unmodified native capture also passes cwd,
answer recognition and raw-identity assertions.

P3's deterministic reproduction recognises a startup at time 10000, advances the
clock to 71000, and replaces the foreground PID in the same terminal without an
intervening absence/age cleanup. The newly recognised request displayed the old
one-minute wait. Inspection confirmed that the request key changed while the
observation timestamp stayed at 10000; the tab had no timestamp in this minimal
case. The observation now includes the explicit source lifecycle key, so a new
terminal creation time, terminal PID, foreground PID or cwd starts its own wait.
The same lifecycle retains its age through polling and the normal age timer.

An additional failing test demonstrated why startup age must also ignore an
older tab `changed_at`. The [official Herdr declarations](https://github.com/herdrdev/herdr-app/blob/7fe7ac34fef8a3ee76cb5d2f17bc8d6331e50bd8/defaults/herdr.d.ts)
define that field as the tab's last state change, not a startup-dialog timestamp.
Startup now uses its local lifecycle observation; reported agents retain the
existing Herdr timestamp path. Installed `hc schema --json` (0.1.18) confirmed
the terminal and foreground identity fields and the meaning of `reported` and
`status`. The [official Claude hook documentation](https://code.claude.com/docs/en/hooks#workspace-trust)
confirms that interactive workspace trust precedes settings-file hooks. It does
not promise stable visual wording or wrapping: the exact 24-column screen is
native capture evidence, not a documented rendering contract.

```sh
node --test --test-name-pattern='folder named Security guide|replacement startup lifecycle|waiting time belongs|startup waiting time' tests/ask.test.js tests/startup.test.js
```

All 13 focused tests pass. Discovery, card/header rendering, tab reactivation and
answer validation run through the real mod with simulated Herdr/GPUI adapters.
`scripts/check.sh` passed all three mod checks and 238/238 Node tests.
The native Claude capture was rerun; the native Herdr UI was not rerun for these
two findings. Earlier native UI checks below do not establish their UI validation.

Os dois achados foram reproduzidos com testes falhando antes das correções. No P2,
a linha `Security guide` da pasta era escolhida como estrutura do diálogo antes
da localização da prosa, escondendo card e contagem e mantendo a aba guardada.
O caso mínimo e uma captura nova do Claude 2.1.319 em 24 colunas reproduziram o
defeito. Agora a pergunta e a explicação completas são localizadas primeiro. A
pasta exata, a estrutura completa e a identidade bruta continuam obrigatórias;
os testes verificam Sim/Não e nenhuma tecla quando a tela muda antes da resposta.

No P3, o novo PID foi reconhecido no mesmo terminal, mas a observação preservou
o horário do processo anterior. A idade agora acompanha a identidade explícita
do ciclo e reinicia quando ela muda, preservando a espera entre releituras do
mesmo ciclo. Um teste adicional falhou com `changed_at` antigo da aba: conforme
o contrato oficial do Herdr, esse horário pertence ao estado da aba. Por isso,
o diálogo inicial usa sua observação local; agentes reportados mantêm o caminho
de horários do Herdr. O schema do hc e a documentação oficial do Claude foram
conferidos, sem tratar a aparência capturada como contrato visual estável.

Os 13 testes focados passaram, assim como as verificações de pasta e identidade
na captura nativa original. `scripts/check.sh` passou nos três mods e nos 238
testes Node. A execução de card, cabeçalho, aba e respostas usa o
mod real com adapters Herdr/GPUI simulados. A interface nativa do Herdr não foi
reexecutada para estes dois achados; as verificações anteriores abaixo não
validam esses cenários na interface nativa.

### Wrapped startup heading / Título inicial quebrado

The heading P2 was reproduced with a one-change fixture (`Accessing` followed by
`workspace:`) and the review's native Claude Code 2.1.319 captures at 20 and 21
columns. All three simulated-runtime cases failed before the fix: no answerable
card, no header count, and the tab stayed put away. Unwrapping only the heading
restored recognition. Removing only the single-line guard was insufficient: the
fixed folder offset included `workspace:` in the path, failing the cwd check.

The parser now consumes the complete known heading before locating the folder.
The native fixtures in `tests/fixtures/workspace-trust-wrapped-heading-{20,21}.txt`
use an equal-length replacement for the temporary directory. Tests cover card and
header discovery, tab reactivation, exact wording, raw identity, Yes/No answers,
and zero keys if heading wrapping changes before the fresh answer read.

```sh
node --test --test-name-pattern='wrapped trust heading|complete wrapped heading' tests/ask.test.js tests/startup.test.js
```

All 11 focused tests pass. The original unmodified native captures also pass cwd
and raw-identity assertions. `scripts/check.sh` passed all three mod checks and
226/226 Node tests.

An isolated native Herdr 0.1.13 home/core/display confirmed the same 21-column
dialog before and after swapping only the installed parser: the fix restored
the card, header count and put-away tab. PT/EN frames were inspected at 640×1200
and 1280×1200. With Yes selected, clicking No exited Claude to bash and cleared
the card/counts, with no app errors. Trust was not accepted; Yes is covered by
the simulated-runtime tests. The 20-column case was replayed, not rerun in the
native app. Screenshots are under `/tmp/herdboard-heading-ui-mha32zyg/`.

O P2 do título foi reproduzido no caso mínimo e nas capturas nativas da revisão
em 20 e 21 colunas: card e contagem ausentes, com a aba ainda guardada. O parser
exigia uma linha de título e iniciava a pasta numa posição fixa; remover só a
primeira restrição ainda incluía `workspace:` no caminho. Agora ele consome o
título conhecido completo antes de localizar a pasta, preservando a tela bruta
no id. Os 11 testes focados e os três checks de mods passaram, assim como os
226 testes Node. As capturas originais também passaram nas verificações de cwd
e identidade bruta.

A interface nativa isolada confirmou o mesmo diálogo em 21 colunas antes/depois
de trocar só o parser instalado: card, contagem e aba guardada foram restaurados.
Foram inspecionados PT/EN em 640×1200 e 1280×1200. Com Yes selecionado, clicar
Não voltou ao bash e limpou card e contagens, sem erros no app. A confiança não
foi aceita; Sim foi validado nos testes simulados. Em 20 colunas foi reproduzida
a captura, sem nova execução na interface nativa.

### Wrapped workspace path / Caminho da pasta quebrado

A further P2 was reproduced before the fix: at 48 columns, Claude Code 2.1.319
also wraps a long workspace path. The parser treated only its first line as the
folder and compared the continuation as part of the question, rejecting the
complete dialog before the cwd check. A fresh native tmux capture is stored in
`tests/fixtures/workspace-trust-wrapped-folder.txt`, with a same-length replacement
for the temporary directory name to preserve its wrapping.

The initial fix located the complete known question/explanation and reconstructed
the preceding path chunks without adding separators (word wraps are addressed
below). The full path must still
match the foreground cwd, and the id retains every original line. Regression
tests cover multiple path lines, card and header discovery, a different cwd,
Yes/No answers and zero keys when only the path wrapping changes on a fresh read.

```sh
node --test --test-name-pattern='wrapped workspace path|wrapped workspace paths' tests/ask.test.js tests/startup.test.js
```

The focused tests failed before the fix and passed after it. The original native
capture and minimal `/a` + `b` reproduction now pass as well. `scripts/check.sh`
passed all three mod checks and 190/190 Node tests. Card, header and answer behavior
were verified in the simulated mod runtime; the real Herdr UI was not rerun for
this follow-up.

Outro P2 foi reproduzido antes da correção: em 48 colunas, o Claude Code 2.1.319
também quebra caminhos longos. O parser tratava só a primeira linha como pasta e
comparava a continuação junto com a pergunta, rejeitando o diálogo antes de
comparar o cwd. A nova captura nativa preserva a quebra com uma substituição de
mesmo comprimento no nome do diretório temporário.

A correção inicial localizou a pergunta/explicação completas e juntou os trechos do
caminho sem acrescentar separadores (quebras entre palavras são tratadas abaixo).
A pasta inteira ainda precisa corresponder
ao cwd, e as linhas originais continuam no id. Os testes verificam card, contagem,
respostas e bloqueio por cwd diferente ou mudança da quebra na leitura seguinte.
Os três checks de mods e os 190 testes passaram. Card, cabeçalho e respostas foram
validados no runtime simulado; a interface real do Herdr não foi revalidada neste
acompanhamento.

### Spaces at path wraps / Espaços nas quebras do caminho

The next P2 reproduced a distinct case: trimming each path line and joining with
`""` turned `name` + `for` into `namefor`, so the cwd check hid a valid card and
its header count. The regression failed before the fix both for the reported
path pattern and the minimal `/a` + `b` screen with cwd `/a b`.
A fresh native Claude Code 2.1.319 tmux capture at 48 columns also failed through
the simulated mod runtime. It is saved in
`tests/fixtures/workspace-trust-wrapped-words.txt`, with a same-length replacement
for the temporary directory name.

The screen alone cannot distinguish `/ab` from `/a b` at that wrap. Discovery and
fresh answer reads now supply the known foreground cwd to `parseAsk`. It matches
each path chunk exactly, restoring spaces from the cwd only between chunks, and
keeps the full raw screen as the guarded id. Tests cover mixed word/mid-name
breaks, multiple spaces at a wrap, Windows path characters, divergent cwds, card
text, header counts, Yes/No, and zero keys when only wrapping changes.

```sh
node --test --test-name-pattern='uses the cwd|workspace path wrapped between words' tests/ask.test.js tests/startup.test.js
```

`scripts/check.sh` passed all three mod checks and 199/199 Node tests. The native
capture was replayed through the real mod with the simulated Herdr/GPUI runtime;
the real Herdr UI was not rerun for this correction.

O P2 seguinte reproduziu outro caso: aplicar `trim()` em cada linha e juntá-las
com `""` transformava `name` + `for` em `namefor`. A comparação com o cwd ocultava
um card válido e sua contagem. Os testes falharam antes da correção no padrão
relatado, no caso mínimo `/a` + `b` com cwd `/a b` e com uma nova captura nativa do
Claude Code 2.1.319 em 48 colunas. A fixture mantém as quebras da captura com uma
substituição de mesmo comprimento no nome da pasta temporária.

A captura sozinha não distingue `/ab` de `/a b` nessa quebra. A descoberta e a
releitura antes da resposta agora passam o cwd conhecido ao parser. Cada trecho
deve coincidir exatamente; só nas quebras são recuperados os espaços do cwd.
O id preserva a tela bruta. Os testes verificam quebras dos dois tipos, espaços
múltiplos, caminhos Windows, cwd divergente, texto do card, contagem, respostas e
bloqueio quando apenas a quebra muda. Os três checks dos mods e os 199 testes
passaram. A captura nativa foi reproduzida no runtime simulado do mod; a interface
real do Herdr não foi revalidada nesta correção.

### Wrapped confirmation footer / Rodapé de confirmação quebrado

The footer P2 was reproduced before the fix with both a minimal change to the
200-column fixture and a fresh native Claude Code 2.1.319 tmux capture at 30 columns.
The footer becomes `Enter to confirm · Esc to` followed by `cancel`. Recognition
required one footer line and an exact total line count, hiding the card and its
header count. Joining only the footer restored recognition with the same cwd.
The capture is saved as `tests/fixtures/workspace-trust-wrapped-footer.txt`, with
a same-length replacement for the temporary directory segment.

The official [Claude workspace-trust documentation](https://code.claude.com/docs/en/hooks#workspace-trust)
confirms that settings-file hooks wait for trust in interactive sessions. The
[Herdr read reference](https://github.com/herdrdev/herdr-core/blob/master/docs/commands.md#hc-read)
defines `--lines 0` as the visible screen without extra history. These contracts
support this separate startup source; they do not specify a stable visual footer
format. The exact 30-column wrapping is capture evidence, not a documented API.

Recognition now joins only the lines after the two cursor options and requires
the complete known footer. The id retains every raw line. Seven new tests cover
recognition, card/header discovery, Yes/No, rejection of incomplete or extra text,
and zero keys if footer wrapping changes before the fresh answer read.
`scripts/check.sh` passed all three mod checks and 206/206 Node tests.

The real Herdr 0.1.13 UI was rerun in an isolated home/core/display. `hc get`
confirmed 30 columns; swapping only the installed parser between the pre-fix version
and the fix hid and restored the card and header count for the same live dialog. PT/EN controls
were inspected at 640×1050 and 1280×1050. With Yes selected in the terminal, clicking
No on the card exited Claude to bash and cleared the card/counts. No trust was
accepted; the Yes path remains covered by the simulated runtime tests.

O P2 foi reproduzido antes da correção no caso mínimo e em uma nova captura nativa
em 30 colunas. O parser exigia uma única linha de rodapé e uma quantidade fixa de
linhas; por isso ocultava card e contagem. Juntar somente o rodapé recuperou o
reconhecimento com o mesmo cwd. A fixture preserva as quebras nativas e usa uma
substituição de mesmo comprimento no nome temporário da pasta.

A documentação oficial confirma a espera por confiança antes dos hooks de settings
em sessões interativas e o contrato de leitura da tela pelo Herdr. Ela não define
o formato visual exato do rodapé: a quebra em 30 colunas foi verificada na captura.
A correção exige o texto completo conhecido, mantém as linhas brutas no id e
bloqueia a resposta quando a quebra muda na releitura. Os três checks dos mods e
206 testes passaram. A interface real isolada confirmou a falha e a correção no
mesmo diálogo de 30 colunas, controles PT/EN nas duas larguras e retorno ao bash
ao clicar Não com Yes selecionado. A pasta não foi aceita como confiável; o envio
de Sim foi validado no runtime simulado.

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
