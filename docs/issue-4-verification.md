# Issue #4 verification / Verificação da issue #4

2026-11-08 (America/Sao_Paulo) · Linux x86_64 / WSL2 · herdr-app 0.1.13 ·
herdr-core / hc 0.1.18 · Node 24.22.1.

## Supported scope

This implementation enables only the captured **Codex CLI 0.167.0 local command
approval**. The tested pi 0.85.1 confirmation is unsupported because it did not
report an agent status. This follows the issue's instruction to narrow the
supported set when only one configuration can be verified. It does not claim
general Codex/pi dialog support.

Codex was launched in a disposable workspace and isolated Herdr core:

```sh
codex --no-daemon --no-alt-screen --ask-for-approval on-request \
  --sandbox read-only -c 'approvals_reviewer="user"'
```

These settings applied to the capture process. Existing agent sessions and
persisted approval settings were not changed. The model was asked to make exactly
one `exec_command` call for `/usr/bin/printf approval-probe`, with
`sandbox_permissions: require_escalated` and justification
`May I run this harmless printf for the Herdboard approval capture?`, then stop
after the result, without retrying a cancellation. Ordinary invocation with the
existing defaults rejected the escalation without a dialog; starting Codex alone
does not establish approval eligibility. The test reused the installed login;
credentials and account/status screens are not included in fixtures.

Direct answers require the complete captured foreground argument vector above,
with no additional overrides, and a Codex foreground process. Other launch
configurations retain the fallback. `0.167.0` identifies the version used to
verify this dialog and configuration; terminal metadata does not expose a binary
version, and the banner scrolls out of later requests. There is no runtime
binary-version check.

The pending request reported `{app: "codex", state: "blocked", kind: "permission"}`.
Raw `hc get` nests that report in `status` and exposes `turn`. The app's actual
`terminals()` snapshot exposes a `status` word and a separate `report`; its
`agents()` has an independent `seq`. **Do not equate `turn` with `seq`.**

## Raw evidence

Files under [`tests/fixtures/codex-0.167.0`](../tests/fixtures/codex-0.167.0):

| Evidence | Meaning |
| --- | --- |
| `command-wide.txt` / `.json` | Paired `hc read --lines 0` and `hc get --json`, 120×40 cells |
| `command-narrow.txt` / `.json` | Same operation, 48×40 cells; wrapped reason and option labels |
| `app-snapshot.json` | Native app `agents()` / `terminals()` for another pending request; 149×29 cells |
| `outcomes.json` | Six independent before/after screens and metadata, exact keys, selection and result |
| `ui-yes-after.*`, `ui-no-after.*` | Screen and core metadata after clicking the real card buttons |
| `question.txt` / `.json` | Real `request_user_input` question, reported `kind: question`; fallback only |
| `disabled-controls.json` | Four independent native recordings: dimensions, 60 fps frame references, pending screens and paired metadata |

Codex captures are unredacted disposable-workspace data. Rendering cleanup is
separate from identity: the complete approval, including environment, reason,
command, persistent option and footer, remains byte exact for the fresh-read
check. Only the option cursor is ignored, justified by these independent outcomes:

| Captured selection | Sent keys | Observed result |
| --- | --- | --- |
| 1, 2, 3, independently | `y` | “You approved … this time”; command prints `approval-probe` |
| 1, 2, 3, independently | `esc` | “You canceled the request …”; conversation interrupted; state becomes idle |

Neither shortcut needs Enter. `esc` cancels the request and interrupts the turn;
it is not presented as a continuing negative tool result. Both languages' No
tooltips name that effect and preserve the agent's original option wording.

The persistent prefix choice `(p)` was **not executed or verified** and is not
offered under More…. It stays part of the request identity, so changing it still
invalidates a click. Use Open and answer for persistent approvals. Other approval
shapes, remote environments, altered key hints, incomplete dialogs and startup
screens remain unsupported. The captured layout includes all six sections;
multiline command/reason formats with additional blank sections are unsupported.

## Pi integration gap

[`tests/fixtures/pi-0.85.1`](../tests/fixtures/pi-0.85.1) records an isolated,
offline pi 0.85.1 run, without model credentials or discovered extensions. The
explicit disposable `probe.js` registers `/capture-confirm`, using `ctx.ui.confirm`
to ask whether to create `capture-marker.txt` inside the disposable workspace.
The versioned extension itself identifies the tested configuration; this is not
a claim about an unspecified permission-gate package.

The complete confirmation was captured at 120×40 and 48×32 cells. `down enter`
declined, leaving the marker absent; a separate `enter` approved and created the
marker containing `approved` plus a newline. However, both pending captures had
`reported: false`, `status: null`, `turn: 0`, and no report. The app also observed
no reported pi agent. No OSC report was fabricated. No extension was installed
into the user's pi configuration. One Windows username in package paths was
replaced with the equal-length `userx`, preserving every physical row and wrap.

Enabling pi still needs a concrete approval integration that reports its blocked
state, effective binding evidence and its own complete before/after captures.

## Native board checks

Used a fresh `HERDR_APP_HOME`, `HC_SESSION`, XDG state/runtime/config directories
and authenticated Xvfb display. Installed this checkout into that app home; the
user's app and core were not used. A temporary observer mod recorded the app API
snapshot, without changing agent reports or production source.

- Inspected pending approval controls in PT and EN at **1280×1000** and **760×1000**.
  Yes/No, Open and answer, Peek and the waiting-time row were visible inside the
  card. No persistent/More… control was offered. Checked the cancellation tooltip
  in both languages.
- A resize changed the terminal wrapping: the first stale click refreshed the
  card and sent no answer. Clicking the refreshed Yes executed the command once;
  repeated clicking did not execute a second command. A new request's No canceled
  the request, interrupted the conversation and cleared Needs you.
- A real non-permission color question reported `kind: question` and showed only
  Open and answer / Peek in PT and EN. The app reported no mod errors.
- Recorded four independent card approvals at 60 fps, in PT/EN at both dimensions.
  The frames below show both answer controls faded while the native permission
  card is still blocked, before the agent advances. Each request then executed
  the harmless command once. The real `main.js` harness also asserts that old
  handlers and further clicks cannot send another plan.

| Native screenshot | Coverage |
| --- | --- |
| [EN wide](images/issue-4-codex-en-wide.png) | Complete approval card in a four-column board |
| [PT narrow](images/issue-4-codex-pt-narrow.png) | Complete controls in the single-column board |
| [EN question](images/issue-4-codex-question-en.png) | Native unsupported-dialog fallback |
| [EN narrow disabled](images/issue-4-codex-disabled-en-760.png) | Both answers disabled during validation, 760×1000 |
| [PT narrow disabled](images/issue-4-codex-disabled-pt-760.png) | Both answers disabled during validation, 760×1000 |
| [PT wide disabled](images/issue-4-codex-disabled-pt-1280.png) | Both answers disabled during validation, 1280×1000 |
| [EN wide disabled](images/issue-4-codex-disabled-en-1280.png) | Both answers disabled during validation, 1280×1000 |

## Automated checks

Parser and board-action tests were written before their production changes and
failed on missing recognition/controls. Tests exercise the public parser and real
card handlers through the existing runtime harness. They cover exact y/esc plans
from every selection, cross-agent rejection, complete request/whitespace changes,
metadata changes before/during validation, failed reads, missing terminals, stale
cache, repeated clicks, hidden cards, late reads, new requests and bounded retries.
Existing Claude numbered permissions, More… and startup tests remain in the suite.

Typechecked both changed JavaScript modules against the installed Herdr/GPUI
declarations with TypeScript (`allowJs`, `checkJs`, `noEmit`). Native mod checks
and the full Node suite passed through `scripts/check.sh`: **all three mods and
308 tests, zero failures or skips**.

Reads and key sends remain separate core operations. A change after the final
check and before a key is processed cannot be excluded by a screen comparison;
this change does not claim an atomic compare-and-send transport.

## Review refinement — 2026-11-09

The real card-handler harness reproduced an old click sending `y` after only the
terminal PID changed during validation. Address and agent `seq` alone did not
identify the same process or working directory. The regression failed before
the correction. The request key now also binds terminal creation, terminal and
foreground PIDs, both working directories, argument vectors and foreground
identity. Missing facts or an unverified foreground configuration retain the
fallback. `hc get` checks the core's source and permission report before and
after the screen reread, including when the app snapshot is stale.

`scripts/check.sh` passed all three mods and **393 tests**, with zero failures or
skips. Both changed JavaScript modules passed TypeScript `checkJs`. New tests
cover source changes during initial reads, retry waits and answer validation;
failed/malformed core reads; a replacement process at the same address/`seq`;
and preservation of the sent latch across volatile title, clock and size changes.

The corrected source was installed into another isolated native Herdr home.
Yes approved exactly once; No canceled a separate request and interrupted the
turn. Controls remained visible in PT/EN at 760×1000 and 1280×1000. A 60 fps
recording captured both buttons disabled during cancellation. Adding the
unverified `-c tui.animations=false` argument kept only Open and answer / Peek
despite a complete, reported Codex permission dialog. No persistent choice was
executed. Native process replacement during validation was not recreated; that
race is covered by the deterministic real-handler harness.

The [refinement evidence bundle](../tests/fixtures/codex-0.167.0/refinement.json)
records source hashes, raw paired screens/metadata, both outcomes and the four
viewport/language captures. Current screenshots: [EN wide](images/issue-4-review-en-1280.png),
[PT wide](images/issue-4-review-pt-1280.png), [EN narrow](images/issue-4-review-en-760.png),
[PT narrow](images/issue-4-review-pt-760.png),
[disabled](images/issue-4-review-disabled-pt-760.png) and
[unverified-configuration fallback](images/issue-4-review-fallback-pt-760.png).

## Português (Brasil)

O suporte desta entrega é o **diálogo local de aprovação de comando do Codex CLI
0.167.0**, capturado na configuração acima. Isso atende à possibilidade da issue
de limitar o conjunto quando apenas uma configuração puder ser verificada.
Outros formatos do Codex e o pi continuam sem resposta direta.

As fixtures preservam as capturas de 120×40 e 48×40, os metadados pareados e o
snapshot real do app. `hc get` guarda o report em `status` e tem `turn`; no app,
`terminals()` separa `status` e `report`, e `agents()` fornece seu próprio `seq`.
Não são o mesmo contador. Nenhum report foi inventado.

A resposta direta exige o vetor completo de argumentos de inicialização acima,
sem overrides adicionais, e um processo Codex em primeiro plano. Outras
configurações mantêm o fallback. `0.167.0` identifica a versão usada para validar
esse formato e configuração; os metadados não informam a versão do binário e o
banner deixa de aparecer após a rolagem. Não há trava de versão em runtime.

Os seis testes nativos independentes confirmaram `y` para aprovar uma vez e `esc`
para cancelar o pedido e interromper o turno, a partir de cada uma das três
seleções, sem Enter. O botão Não explica esse efeito no tooltip. A opção `(p)`
persistente não foi executada nem validada e não aparece em Mais…; continua no
terminal e na identidade completa do pedido. Perguntas comuns, ambientes remotos,
telas incompletas e novos formatos de confiança inicial mantêm o fallback.

O pi 0.85.1 foi testado com a extensão descartável `probe.js`, por meio de
`ctx.ui.confirm`, a 120×40 e 48×32. A aprovação criou o marcador e a recusa não o
criou. Porém, o pedido permaneceu com `reported: false`, `status: null` e `turn: 0`.
Essa configuração não fornece um agente bloqueado ao quadro; para habilitar pi
ainda é necessária uma integração concreta com report, bindings e capturas
verificados. Não foi instalada uma extensão nas configurações do usuário. Um
nome de usuário Windows foi substituído por `userx`, do mesmo tamanho.

O app real foi inspecionado em PT/EN a 1280×1000 e 760×1000, com todos os controles
dentro do card. O Sim executou o comando uma vez, o Não cancelou um novo pedido e
uma pergunta real de cor manteve somente Abrir e responder / Espiar. Após mudar
as quebras por redimensionamento, o clique antigo apenas atualizou o card.
Não houve erros de mods. Quatro gravações independentes a 60 fps capturaram os
dois controles desabilitados enquanto o card ainda estava bloqueado, em PT/EN
nas duas dimensões; cada pedido executou o comando uma única vez. O harness
também cobre cliques e handlers antigos durante esse intervalo. Os dados temporários
da execução ficam em `/tmp/herdboard-issue4-native-w1swbhyz`.

Os testes novos falharam antes da implementação e cobrem parser, teclas, corridas,
retentativas e preservação dos fluxos Claude. Os módulos alterados passaram na
checagem de tipos; `scripts/check.sh` executa os três checks e a suíte completa.
O resultado final foi de **três mods e 308 testes aprovados, sem falhas ou skips**.
Leitura e envio continuam sendo operações separadas do core, sem garantia atômica.

Na revisão de 2026-11-09, o harness real reproduziu um clique antigo enviando `y`
após trocar apenas o PID durante a validação. O teste falhou antes da correção.
A chave agora vincula criação, PIDs, pastas, argumentos e identidade do processo;
fatos ausentes ou configuração não verificada mantêm o fallback. `hc get` confere
origem e report no core antes e depois da releitura, mesmo com snapshot atrasado.
Os três mods e **393 testes** passaram, sem falhas ou skips, além da checagem de
tipos. A cobertura inclui leituras iniciais, retentativas, respostas, erros do core,
processo novo no mesmo endereço/`seq` e preservação do latch após mudanças voláteis.

A versão corrigida também foi testada em outro Herdr isolado: Sim aprovou uma vez
e Não cancelou um pedido separado, interrompendo o turno. Os controles ficaram
visíveis em PT/EN a 760×1000 e 1280×1000; uma gravação a 60 fps mostrou os dois
desabilitados. Um Codex com o argumento adicional não verificado
`-c tui.animations=false` manteve só Abrir e responder / Espiar, apesar do diálogo
completo e report de permissão. Não houve aprovação persistente. A troca de
processo durante a validação foi reproduzida no harness, sem reprodução nativa
dessa corrida. O bundle e as capturas da revisão estão vinculados acima.
