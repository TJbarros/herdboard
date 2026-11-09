# Cards do Cursor CLI: verificação da issue #29

[English](issue-29-verification.md). Registro de 2026-11-09, em Linux.

## Origem e formas de inicialização

Versões testadas: herdr-app **0.1.14**, hc **0.1.19**, Cursor CLI
**2026.11.05-86047df** e Node **24.22.1**. A
[documentação oficial](https://cursor.com/docs/cli/overview) descreve `agent`
interativo. O symlink instalado aponta para o launcher versionado `cursor-agent`,
que executa seu Node com o próprio caminho em argv[0], `--use-system-ca` opcional
e o `index.js` da instalação.

As três [fixtures nativas](../tests/fixtures/cursor-2026.11.05/), com substituições
de privacidade, registram `agent` direto, `agent` dentro de um shell e
`agent --yolo` com `AGENT_CLI_CREDENTIAL_STORE=file` (ramo sem `--use-system-ca`).
A API pública `terminals()` fornece esses dados atuais do processo. O argv
original do shell, o nome MainThread e a flag `reported` isoladamente não bastam.
Esse layout da instalação é um contrato observado; não é uma API prometida para
todas as versões do Cursor. Nenhum home, número de versão, PID ou endereço é fixo.

Somente essas formas interativas são declaradas como suportadas. Prompts iniciais,
subcomandos de retomada/listagem/status, modo print, outras opções e layouts de
executáveis Windows ficam fora da descoberta. `--yolo` é opcional; o Herdboard
não o adiciona. Não há alterações em hooks, wrappers, tabela de programas ou
configuração de aprovação.

A descoberta exige terminal vivo/exato, instante de criação e PIDs positivos,
o launcher e entry point capturados e associação atual inequívoca de pane → aba
→ espaço. Mantém os endereços remotos completos e lê fatos reativos de forma
síncrona, sem fila, leitura de tela, timer novo ou conclusão assíncrona que possa
ressuscitar um processo encerrado. A fixação usa a label nativa `herdr.pinned`.
Agentes reportados têm prioridade por endereço.

## Ausência de status e ciclo de vida

O [status do Herdr](https://herdr.dev/core/#status-from-the-source) vem do report
OSC 7501 do programa. Nenhuma sessão Cursor registrada forneceu status utilizável.
O card usa **Status indisponível / Status unavailable**, cor neutra e título
**Cursor CLI**, sem deduzir tarefa, atividade, pergunta, idade ou aviso de travamento.
Ele não responde a aprovações do Cursor.

A quinta coluna só aparece quando necessária; a lista estreita tem card
identificado e contagem. Filtros, abas guardadas, fixação, contagens dos espaços e
consultas de worktree usam a mesma elegibilidade. A descoberta do Cursor não deixa
o espaço em alerta. Um agente reportado substitui o card uma vez; perder o report
restaura o estado neutro. Encerrar o Cursor e voltar ao shell, ou encerrar seu
terminal, remove o card. Substituições e mudanças de associação usam os fatos
atuais. Títulos reportados lembrados são vinculados à criação do terminal e aos
PIDs do terminal/processo; o card de descoberta não os usa.

A origem identifica o processo, não uma conversa estável do Cursor. Trocar de
conversa no mesmo processo mantém um card neutro, sem reutilizar tarefa anterior.
No Herdr 0.1.14, os atalhos nativos de próximo/anterior agente ainda exigem status;
abrir pelo card e Espiar funcionam sem ele. Não se declara integração de emissão
de reports nem extração de atividade do Cursor.

## Regressão e evidência nativa

Antes da mudança de produção, `node --test tests/cursor-runtime.test.js` falhou com
`the running Cursor session must reach the board`. O mesmo harness do módulo real
cobre descoberta, casos negativos, status explícito em EN/PT, endereços completos
das ações, associação, filtros, abas guardadas, fixação, transição para report,
substituição/encerramento de processo, títulos e consultas limitadas de worktree.
Confere também a ausência de leituras de perguntas/startup/atividade para Cursor
sem status. Transição para report e cenários remotos são controles simulados.

A validação nativa usou home do app, sessão do core, diretórios XDG e display Xvfb
autenticado próprios. O app e os terminais existentes do usuário não foram usados.
A primeira sessão não autenticada abriu a tela de login; sessões posteriores
reutilizaram o login existente pelo XDG config daquele processo, sem copiar
credenciais. Somente o diretório temporário de verificação foi confiado. Nenhuma
tarefa foi enviada ao modelo. Um mod observador registrou a API real, sem alterar
reports ou código de produção. Nos JSONs, caminhos privados e nomes de máquina foram substituídos; as imagens não foram alteradas.

O quadro original também foi executado nesse app com Cursor real:
[nenhum card](evidence/issue-29/baseline-missing.png). O quadro corrigido mostrou um.

| Idioma e janela | Card | Espiar | Resultado |
| --- | --- | --- | --- |
| EN 1280×1000 | [imagem](evidence/issue-29/en-1280.png) | [imagem](evidence/issue-29/en-1280-peek.png) | Ambas as ações chegaram a t4 |
| PT 1280×1000 | [imagem](evidence/issue-29/pt-1280.png) | [imagem](evidence/issue-29/pt-1280-peek.png) | Ambas as ações chegaram a t4 |
| EN 760×1000 | [imagem](evidence/issue-29/en-760.png) | [imagem](evidence/issue-29/en-760-peek.png) | Ambas as ações chegaram a t4 |
| PT 760×1000 | [imagem](evidence/issue-29/pt-760.png) | [imagem](evidence/issue-29/pt-760-peek.png) | Ambas as ações chegaram a t4 |

Cada abertura começou em outra aba. Espiar também partiu dela e
`focused().terminal` passou a ser t4 no overlay. Todas as observações ficaram sem
erros de mod. Os [resultados](evidence/issue-29/native-navigation.json) e o
[snapshot pareado](evidence/issue-29/native-app-snapshot.json) foram guardados.
Em 760px, a regra existente do cabeçalho compacto omite a contagem do espaço;
o indicador de status mostra 1.

Capturas adicionais verificam [fixação](evidence/issue-29/native-pinned.png),
[Este espaço](evidence/issue-29/native-this-space.png) ocultando o Cursor a partir
de outro espaço, [Todos](evidence/issue-29/native-all-spaces.png) restaurando-o,
[duas sessões](evidence/issue-29/native-second-session.png) e
[volta ao shell](evidence/issue-29/native-process-exit.png) removendo o segundo
card. Os JSONs pareados e o [resultado do ciclo de vida](evidence/issue-29/native-lifecycle.json)
registram associação e processo. Encerrar a sessão anterior t2 também removeu seu
card e deixou t4. Navegação remota real e transição de um report real do Cursor não
foram exercitadas; o harness cobre seus contratos de comando e associação.

## Verificações

Na entrega inicial da issue #29, os três checks nativos e **506 testes** passaram,
incluindo **32 testes Cursor**; a configuração TypeScript gerada ainda apontava
erros. A [correção posterior de tipagem](typechecking.pt-BR.md) resolve esses erros
e inclui os três mods na verificação completa. Execute `npm ci` e depois
`scripts/check.sh`; `npm run typecheck` roda somente o compilador, usando as
configurações ES2023 versionadas e as declarações instaladas do Herdr.
