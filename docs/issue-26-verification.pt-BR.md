# Total de alterações do worktree: verificação

Verificado em 2026-11-09. O número representa os registros de arquivos pendentes
no Git do worktree do terminal, incluindo alterações feitas por qualquer pessoa.
Não atribui autoria ao agente. Dados e capturas de conexões remotas reais ficam
privados e não fazem parte deste documento nem dos artefatos versionados.

## Git real e runtime controlado

`tests/git-changes.test.js` usa repositórios Git temporários reais: repositório
limpo e sem primeiro commit, consulta por subpasta, arquivos não rastreados
individualmente, ignorados, nomes com tabulação/quebra de linha, mudanças no
índice e no disco do mesmo arquivo, exclusão, adição, troca de tipo, renomeação
reconhecida versus exclusão/arquivo novo, conflito de merge e configurações que
ocultariam arquivos não rastreados ou desativariam renomeações. Também cobre
pastas ausentes e fora do Git.

`tests/git-runtime.test.js` executa o `main.js` real com fronteiras Herdr/UI
controladas e registra toda tentativa de exec, inclusive descobertas e falhas.
Verifica pasta/máquina exatas, compartilhamento, worktrees e máquinas distintos,
substituição do terminal no mesmo milissegundo, respostas antigas, ausência de
fallback local, zero versus indisponível, limite físico de dois comandos mesmo
com lentidão, intervalo de retentativa ao ocultar/mostrar, filtros, Guardar,
Ociosos recolhidos, instâncias auxiliares, altura zero e a lista compacta. São
testes simulados do runtime; não comprovam a interface nativa. As regressões da
revisão também cobrem altura positiva preservada sob ancestrais ocultos/layouts
removidos, mudanças de demanda antes do despacho sem renderização intermediária,
reservas de cache obsoletas, intervalo após despacho adiado e contexto novo do callback.

Os pontos de teste autorizados foram a interpretação do resultado Git com
repositórios reais e o harness do `main.js`. Foram registrados ciclos de falha e
sucesso antes do helper, proteção contra truncamento, consulta do card, revisão
do terminal, intervalo ao ocultar, mudanças de tipo e exigência de altura visível.
Os logs completos ficam no pacote temporário de evidências da sessão. Após integrar
a identificação de máquina, `scripts/check.sh` passou nas três verificações de mod
e em **429 testes Node**. O [registro integrado](agent-card-context-verification.pt-BR.md)
documenta a validação final após as demais mudanças dos cards e correções da revisão.

## API de execução nativa

O `exec` real do aplicativo Herdr isolado preservou NUL, tabulação e quebra de
linha. Uma fixture local temporária retornou cinco registros, incluindo MM e
renomeação; raiz e subpasta retornaram saídas idênticas. Comando ausente rejeitou,
código 7 foi preservado e stderr também foi preservado.

Cada fluxo foi truncado silenciosamente em **8 MiB**, ainda com código zero:
9 MiB em stdout perdeu o marcador final; 9 MiB em stderr foi truncado enquanto
stdout pequeno e válido sobreviveu. A implementação rejeita saídas cuja soma de
bytes UTF-8 atinge o limite, de forma conservadora. Terminar em NUL não basta para
comprovar que o resultado está completo.

Uma verificação separada em transporte remoto real retornou os mesmos cinco
registros da fixture descartável, com NUL e nomes especiais preservados, código
zero e **93 ms**. Isso comprova o roteamento/transporte nativo daquele exec; não
comprova a apresentação do quadro remoto. Nenhum nome, identificador, caminho,
configuração ou captura de conexão real é publicado.

## Carga nativa com consumidores sintéticos

O scheduler `WorktreeChanges` de produção executou Git real por `exec` do Herdr em
repositórios locais descartáveis. Os consumidores são registros de demanda
sintéticos; não são 40 sessões nativas de agentes. Cada repositório tinha um
arquivo rastreado modificado; a fixture maior tinha 10.000 arquivos rastreados.
Tempos por comando, totais e hash do código medido estão em
[`native-exec-load.json`](evidence/issue-26/native-exec-load.json).

| Demanda sintética | Duração | Todos os comandos | Taxa | Latência mín. / mediana / máx. | Pico físico |
| --- | --- | --- | --- | --- | --- |
| 40 consumidores, um worktree com 20 arquivos | 22,112 s | 4 | 0,181/s | 15 / 16,5 / 77 ms | 1 |
| 8 consumidores, oito worktrees com 20 arquivos | 22,161 s | 32 | 1,444/s | 15 / 16 / 96 ms | 2 |
| 40 consumidores, um worktree com 10.000 arquivos | 22,152 s | 4 | 0,181/s | 37 / 75 / 96 ms | 1 |

Todos os consumidores terminaram com total um. Cada cenário compartilhado usou
uma descoberta e três status; oito worktrees usaram oito descobertas e 24 status.
O **intervalo mínimo de 10 segundos** mantém o trabalho recorrente perto de 0,1
comando/s por worktree compartilhado após a descoberta, enquanto o maior levou
até 96 ms por comando. O **limite de dois comandos** restringe a concorrência,
incluindo descoberta. Não são garantias de latência para qualquer repositório ou
máquina remota. Consultas mantêm a vaga até terminar fisicamente; timeout lógico
não cria duplicação.

## Limite da validação visual nativa

A [verificação integrada final](agent-card-context-verification.pt-BR.md) registra
a matriz nativa local/remota nos dois idiomas em 1280, 1024 e 760 px, incluindo as
dimensões reais do quadro, tooltips e ações. As medições de exec deste ticket
permanecem separadas dessa evidência visual e da carga de atividade com agentes reais.
