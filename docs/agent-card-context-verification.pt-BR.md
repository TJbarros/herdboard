# Verificação integrada dos cards de agentes

[English](agent-card-context-verification.md)

2026-11-09 · issues #25–#27 · base `7beaeb4` · herdr-app 0.1.14,
hc 0.1.19, Node 24.22.1, Git 2.43.0.

## Ambiente e privacidade

Foram usados pastas isoladas para o app e o core, além de um display X11 isolado.
Sessões descartáveis reais de Claude Code e Codex forneceram os próprios reports;
nenhum status de agente foi fabricado. O transporte remoto existente foi reutilizado
pelo core descartável. A configuração do app, o cadastro remoto e os arquivos dos
projetos do usuário não foram alterados.

Nomes, endereços, identificadores, caminhos, configurações e screenshots da conexão
real permanecem fora do repositório. As evidências mistas foram inspecionadas em
privado; este registro contém apenas resultados agregados. Snapshots locais
versionados descrevem sessões descartáveis; fixtures remotas simuladas são
explicitamente sintéticas.

## Layout nativo

Foi instalada a implementação combinada de atividade, Git e máquina. Uma
instrumentação temporária registrou somente as dimensões pelo callback de tamanho
existente; a lógica de layout e de consultas permaneceu a implementação sob teste.
O observador de um pixel e as bordas explicam a diferença entre quadro e janela.

Cada linha foi inspecionada em **português e inglês**, com Ocioso aberto. Foram
exercitados Todos e Este espaço. Os screenshots foram inspecionados e ficam privados.

| Janela | Largura real do quadro | Altura em Este espaço | Altura em Todos |
| --- | --- | --- | --- |
| 1280 × 1000 | 1231 px | 269 px | 358 px |
| 1024 × 1000 | 975 px | 269 px | 358 px |
| 760 × 1000 | 711 px | 358 px | 358 px |

- A matriz local inicial mostrou Trabalhando, bloqueados, Concluído e Ocioso juntos.
  Atividade, idade do estado, identificação da máquina e o total esperado de dois
  arquivos do worktree descartável apareceram sem sobrepor os controles.
- Em 1024 px, as ações de hover permaneceram acessíveis; localização e idade
  truncadas conservaram o tooltip. Em 760 px, a lista compacta rolou até Concluído
  e Ocioso, mantendo total do worktree e máquina visíveis nos dois idiomas.
- A visão mista privada identificou cada origem remota e a local, inclusive quando
  Este espaço selecionava o espaço local. Alternar Todos / Este espaço preservou as
  entradas esperadas. Não houve erros de mod nas doze capturas nativas.
- Um alias gerado de 32 caracteres, alterado apenas no cliente descartável,
  foi truncado no badge e apareceu inteiro nos tooltips em português e inglês.
  A nova qualificação dos IDs vivos atualizou a identificação exibida.
- Remover esse cadastro remoto descartável retirou as entradas remotas e restaurou
  a apresentação apenas local, sem badges de máquina. O cadastro no cliente
  original permaneceu inalterado.
- Uma ferramenta real de Claude em primeiro plano forneceu uma atividade longa.
  O card truncou o rótulo, enquanto os dois idiomas ofereceram o texto original
  completo no tooltip.

O harness verifica separadamente os alvos exatos de foco, Espiar, Fixar, Desafixar
e Guardar. Nenhuma interação com um agente remoto substituiu esses testes
determinísticos. Não foram recriados perda física de rede e diálogos de permissão
remotos no app nativo; os caminhos de indisponibilidade e resposta obsoleta estão
cobertos pelos testes de runtime controlado.

## Evidências das consultas

- [Atividade](issue-25-verification.pt-BR.md): capturas reais largas e estreitas
  fundamentam os formatos de Claude/Codex habilitados; a configuração testada de pi
  permanece indisponível. Um e quatro agentes reais Trabalhando mediram o intervalo
  de cinco segundos após conclusão e o pico de duas leituras simultâneas.
- [Git](issue-26-verification.pt-BR.md): testes com Git real fundamentam a contagem;
  a execução nativa preservou NUL, tab e newline. A saída acima de 8 MiB foi truncada
  silenciosamente com sucesso, por isso a implementação rejeita saídas no limite.
  A carga nativa usou consumidores sintéticos com Git real, separadamente das
  medições de atividade com agentes reais. A execução remota privada retornou o
  fixture descartável esperado sem fallback local.
- [Máquina](issue-27-verification.pt-BR.md): origem reativa por ID completo e ações
  com alvos exatos são testadas pelo mod real; o layout misto nativo foi inspecionado
  em privado conforme o registro acima.

## Verificações integradas

As revisões independentes de padrões e de aderência à spec reproduziram os defeitos
de visibilidade dos ancestrais e de despacho adiado do Git. A revisão de padrões
também pediu o registro de atividade em português. Um implementador novo corrigiu
os três pontos, com testes falhando antes das mudanças no runtime. Os novos casos
incluem despacho sem render intermediário, consumidores removidos ou alterados,
reservas canceladas, vagas físicas e intervalo contado do despacho efetivo.

`scripts/check.sh` passou nos três mods e em **471 testes**, sem falhas, skips ou
cancelamentos. O conteúdo de runtime/testes da integração final é idêntico ao dessa
verificação completa. Os 78 testes focados de atividade/Git/máquina e o check do mod
passaram novamente após o merge. As duas reproduções independentes de visibilidade
agora tentam zero comandos Git, contra um na implementação revisada.

Os módulos finais foram instalados no app isolado sem instrumentação. Seus hashes
correspondem à integração, o total esperado do worktree descartável continuou
visível e o app não informou erros de mod. A alteração final não inclui mídia nova
nem identificadores da conexão real. A evidência nativa acima permanece distinta
dos testes de runtime controlado.
