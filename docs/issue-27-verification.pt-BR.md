# Verificação da issue #27

Data: 2026-11-09. Ambiente: herdr-app 0.1.14, hc 0.1.19, Node 24.22.1,
Git 2.43.0, Linux. O app usou pastas isoladas para o app e o core; a pasta padrão
do app e os mods oficiais não foram alterados.

## Observações nativas

[O snapshot mínimo das APIs](evidence/issue-27-local-association.json) foi obtido
das APIs reais `agents()`, `spaces()`, `panes()`, `terminals()` e `machines()` do
app em execução. Claude Code e Codex reportaram seus próprios status de verdade;
nenhum status foi fabricado para esta evidência.

O campo `space` dos dois agentes corresponde ao `id` completo do espaço local.
Esse espaço informa `machine: null`. O `pane` de cada agente corresponde a um
pane cujo `terminal` é o mesmo endereço completo do agente e cujo `tab` pertence
ao espaço. O `herdr.d.ts` renovado define a máquina em `SpaceInfo`; `AgentInfo`
oferece `space`, `tab`, `pane` e `address`, sem campo próprio de máquina. A
implementação segue essa associação independentemente do espaço ativo.

Os arquivos gerados foram lidos do app isolado 0.1.14 após a inicialização. SHA-256:

- `herdr.d.ts`: `814d0115fbf97638ff030fde8ea2836710244d3093ebc28aa56f696d6dc34e03`
- `AGENTS.md`: `2746eae21ff702f8077177ec5e9be9948dedbf881c45eaad82811ffe11f83e26`

Somente a máquina local descartável estava presente nesse snapshot inicial
(`name: null`, `layout: ready`). Esse snapshot não comprova comportamento remoto.
A demonstração nativa simultânea local/remota, desconexão/reassociação remota,
tooltips completos de nomes longos e layout/ações com máquinas mistas nas larguras
de janela 1280, 1024 e 760 px são validados separadamente pelo coordenador. O
resultado final agregado pode ser registrado aqui sem publicar nomes de máquinas,
endereços, identificadores, caminhos, configurações ou screenshots privados. Dados
remotos reais ficam fora do repositório. As larguras simuladas abaixo não comprovam
quebra de texto nem ausência de clipping nativo.

## Testes simulados com o main.js real

`node --test tests/machines.test.js` carrega o mod real pelos adaptadores existentes
das fronteiras Herdr/GPUI. Os nove cenários cobrem:

- Apresentação apenas local e adição reativa de espaços remotos.
- Associação ausente/inválida, reatribuída ou desaparecida e remoção do agente.
- Linhas visíveis de Ocioso traduzidas e recolhimento sem entradas extras.
- Cards bloqueados e lista compacta, incluindo entradas compactas de Ocioso.
- Filtro Todos / Este espaço e navegação por IDs completos com nomes iguais.
- Argumentos exatos de foco, Espiar, Fixar, Desafixar e Guardar para `t1` e `build/t1`.
- Origem remota indisponível sem adicionar consulta `hc machine` nos ticks.
- Nomes longos originais e tooltips PT/EN completos com larguras simuladas de quadro
  1236, 980 e 716 px; são entradas, não medidas de layout nativo.
- Cards iniciais reconhecidos, vínculo completo pane/aba/espaço e Guardar revertido
  nos IDs exatos.

Quatro ciclos verticais red/green falharam primeiro por falta dos rótulos mistos,
desconhecidos, de Ocioso e de bloqueados, passando após a implementação de cada
comportamento. Os casos de filtro/ação/inicialização preservam comportamento já
suportado na base, passando sem alterar a identidade. Os logs externos estão em
`/tmp/herdboard-issues-25-27/evidence-27/`; são artefatos da sessão, não um pacote
portável de evidência nativa.

Execute `scripts/check.sh` para verificar todos os mods e a suíte Node completa.
Essas verificações não fazem o layout nativo de cards mistos. O coordenador registra
separadamente o resultado final integrado e a verificação de larguras com agentes
locais reais.
