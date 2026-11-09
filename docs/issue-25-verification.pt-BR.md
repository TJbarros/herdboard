# Verificação da issue #25

[English](issue-25-verification.md)

2026-11-09 · app/core nativos Linux isolados · herdr-app 0.1.14 · hc 0.1.19 ·
Node 24.22.1. A pasta principal do app e os mods oficiais instalados não foram alterados.
Dados de conexão e screenshots com máquinas mistas ficam privados, fora do repositório.

## Atividade compatível

A atividade é lida da tela visível do terminal, independentemente do título da tarefa
e das perguntas bloqueadas. Somente as configurações capturadas abaixo são elegíveis.
Estas são configurações de verificação, sem recomendar mudanças na política de
permissões existente. A API do modelo não expõe a versão do binário instalado; as
versões identificam as capturas e não comprovam suporte a toda versão com saída parecida.

| Agente | Configuração efetiva em primeiro plano | Atividade reconhecida |
| --- | --- | --- |
| Claude Code 2.1.319 | `claude --permission-mode bypassPermissions`; Opus 5.5 high, hooks e linha de status personalizados existentes | Rótulo da ferramenta quando seu tempo decorrido e comando `$` estão junto da fase ativa; caso contrário, a fase original, como `Sublimating…` |
| Codex CLI 0.167.0 | `codex --no-daemon --no-alt-screen --ask-for-approval never --sandbox workspace-write`; GPT-6.1-Sol xhigh; também o lançamento capturado com uma tarefa inicial posicional | Fase original `Working`, incluindo tempo em segundos/minutos; essa interface capturada não expõe uma ação atual mais descritiva |
| pi 0.85.1 | Launcher instalado existente; nenhum modelo/provedor utilizável configurado | Indisponível: a inicialização e o erro após enviar a tarefa não reportaram um agente; nenhum status foi fabricado nem credencial adicionada |

A extração de Claude exige o formato capturado de spinner/tempo decorrido, prompt
vazio entre separadores e rodapé final de permissões. Um rótulo de ferramenta também
precisa do temporizador e comando atuais imediatamente antes da fase; texto de
transcrição entre eles invalida o rótulo. Codex exige o indicador ativo de interrupção,
prompt e rodapé do modelo. Prompts enviados, fases concluídas, histórico isolado,
atalhos de teclado, telas incompletas e outras configurações usam o estado neutro.

As fases capturadas têm escopo restrito. Claude oferece outras variantes de
spinner/tempo e rodapés personalizados; Codex oferece outros modelos/configurações.
Não se declara suporte a esses casos. Um rótulo original reconhecível pode aparecer
truncado no card; o tooltip contém seu texto completo nas duas apresentações do quadro.

## Evidência nativa versionada

Somente sessões locais descartáveis estão incluídas em
[`tests/fixtures/activity`](../tests/fixtures/activity):

- `claude-code-2.1.319/working-wide.*`: 148×33 células, sleep Bash ativo com rótulo
  original da ferramenta em português, comando e fase `Infusing…`.
- `claude-code-2.1.319/working-narrow.*`: 82×33 células, hook ativo de envio do prompt
  e fase `Sublimating…`. `tool-narrow.*`: 82×32, sleep Python síncrono, temporizador,
  comando, atalho de segundo plano e fase `Generating…`.
- `codex-0.167.0/working-wide.*` / `working-narrow.*`: 148×33 e 82×33 células,
  sleep inofensivo ativo, fase `Working` e indicador de interrupção.
- `codex-0.167.0/initial-task-wide.*` / `initial-task-narrow.*`: 148×26 e 82×25,
  lançamento real pelo Herdr com a primeira tarefa em argv e progresso em minutos.
- `pi-0.85.1/unavailable-*` / `error-wide.*`: erros de inicialização/ausência de
  modelo e de envio de tarefa, sem agente reportado. A inicialização larga tem
  148×33 células; a estreita, 82×33.

Cada tela textual acompanha metadados de `hc get`. As capturas usam `--lines 0` e
preservam o texto da atividade. Um caminho de perfil Windows na evidência de pi usa
a substituição `userx` de mesmo comprimento. Testes negativos também derivam telas
deliberadamente incompletas ou históricas dessas fixtures; essas transformações
são casos simulados. Snapshots nativos do app confirmaram a separação `status`/`report`
e a presença de `created_ms`, PIDs e argv do terminal/primeiro plano, cwd do primeiro
plano, `turn` e o `seq` independente do agente. Um turno nativo posterior mudou sem
troca do processo. `seq` invalida mudanças de report de forma conservadora, sem ser
equiparado a `turn`. Snapshots completos do observador nativo são privados e não
estão versionados.

## Consultas e ciclo de vida

Somente a instância dos cards consulta consumidores Trabalhando visíveis, respeitando
filtros, Guardar, ancestrais ocultos e layouts expandidos/diferentes. As leituras usam
o endereço completo do terminal, incluindo qualificador remoto. Metadados ausentes e
lançamentos incompatíveis não originam leituras. Cabeçalho, menu, pane e rail não
originam nenhuma. As leituras existentes de inicialização e perguntas bloqueadas
conservam seus limites separados.

O intervalo mínimo é **5000ms após a conclusão**, conferido por um temporizador de
um segundo e pelas renderizações. Há **2 vagas físicas globais de atividade** e
**1 por endereço**. Nenhuma fila sobrevive fora do mapa de consumidores atual.
Leituras lentas mantêm a vaga; invalidar o ciclo de vida não cria outra leitura
física para o mesmo endereço. Falhas limpam a atividade e respeitam o mesmo intervalo;
o texto em cache expira em **10000ms**. Mudanças de status, turno, terminal, primeiro
plano, revisão do report, associação ou consumidor visível invalidam o texto anterior
e as respostas tardias. A atividade é transitória e nunca é gravada no cache
persistido de títulos de tarefa.

## Medições de carga nativa

Instrumentação temporária no quadro isolado registrou tentativas de leitura de
atividade imediatamente antes de `hc`, com horário/código de conclusão depois.
Os artefatos da medição ficam fora do repositório. São leituras reais da API nativa,
sem se limitar a uma medição de latência no shell. Carga: uma e depois quatro sessões
locais descartáveis de Codex executando sleeps inofensivos, mesmo worktree descartável,
quadro visível, filtro Este espaço, Ocioso aberto; janela 1280×1000. A largura real do
quadro não foi registrada nessa medição de carga. A coluna dos quatro agentes rolou
normalmente; a matriz integrada final abaixo registra dimensões medidas separadamente.

| Carga nativa | Observação | Tentativas / concluídas | Taxa | Latência mín. / mediana / p95 / máx. | Pico de concorrência física | Intervalo mínimo após conclusão |
| --- | --- | --- | --- | --- | --- | --- |
| 1 agente Trabalhando | 41,942s | 8 / 8, 0 erros | 0,191/s | 11 / 39,5 / 65 / 65ms | 1 | 5008ms |
| 4 agentes Trabalhando | 38,469s | 28 / 28, 0 erros | 0,728/s | 12 / 56 / 278 / 397ms | 2 | 5004ms |

O intervalo de cinco segundos manteve a carga nativa abaixo de uma consulta de
atividade por agente a cada cinco segundos; duas vagas limitaram as leituras
simultâneas, conservando margem para atualizar os cards. As amostras comprovam o
comportamento nativo local dessa carga; não medem transporte remoto, grandes grupos
de agentes nem um limite global que inclua leituras de inicialização/perguntas.
A instrumentação foi temporária e não faz parte do código de produção.

## Evidências de teste e validação restante

Os registros de TDD estão fora do repositório em
`/tmp/herdboard-issues-25-27/evidence-25`: pares numerados de falha/sucesso cobrem a
linha neutra, extração nativa, rejeição de histórico, intervalo/endereço, expiração
com leitura travada, rótulos de ferramentas ativas e lançamento com tarefa inicial.
Os testes de ciclo de vida e limites contam toda tentativa de leitura, incluindo
falhas e leituras obsoletas. Vinte consumidores simulados exercitam o teto de duas
vagas, exclusão por endereço, renderizações repetidas, limpeza de fila e ordem de
conclusão. Outros casos cobrem trocas de processo/terminal/turno, todas as condições
de visibilidade, despacho adiado, metadados ausentes, rejeição e código não zero,
expiração e tooltip completo com atividade original longa. Esses testes simulados
não comprovam desempenho remoto nativo nem métricas das fontes renderizadas.

`scripts/check.sh` passou após integrar o commit `0933647`: as três verificações de
mod e **455 testes** passaram. A [verificação integrada final](agent-card-context-verification.pt-BR.md)
registra a matriz nativa PT/EN nas janelas 1280, 1024 e 760px, com larguras de quadro
medidas de 1231, 975 e 711px. A inspeção nativa apenas de atividade em 1280 confirmou
a terceira linha, idade do estado e rolagem; tamanhos combinados de Git/máquina e
ações de hover estão registrados na matriz final. As imagens antigas do guia
precedem essa linha adicional. Nenhum screenshot privado de máquinas mistas é
versionado.
