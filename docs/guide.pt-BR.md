# Guia do Herdboard

[← Voltar ao README](../README.pt-BR.md) · [English](guide.md)

## Como usar

### Iniciar um agente no projeto certo

1. Clique no **+** ao lado das abas (ou aperte `Ctrl+Shift+T`).
2. Em **Abrir em**, escolha a pasta do projeto. A primeira é onde a aba ativa está
   agora; as outras são as pastas dos seus outros terminais abertos.
3. Escolha **Terminal** ou um agente (Claude Code, Codex, Gemini…). A nova aba abre
   nessa pasta, no espaço atual.

<img src="images/usage-new-tab.pt-BR.png" width="302" alt="Menu de nova aba: Abrir em lista as pastas de projeto, depois Terminal e os agentes instalados">

*O menu do **+**: escolha a pasta em **Abrir em** e depois um terminal ou um agente.*

Precisa de um projeto novo? **⋯ › Novo espaço** cria um espaço na pasta da aba
ativa; **+ › Novo espaço** cria na pasta escolhida em **Abrir em**. Os dois ficam na
mesma máquina do espaço ativo.

### Responder um agente que precisa de você

Quando um agente para e pergunta algo, o card dele vai para **Precisa de você** e a
coluna fica vermelha. Se ele estiver em outro espaço, esse espaço também fica vermelho
no cabeçalho.

<img src="images/usage-needs-you.pt-BR.png" width="470" alt="Coluna Precisa de você com um card de permissão bloqueado mostrando a pergunta, Sim, Não, Mais…, Abrir e responder, Espiar e o tempo de espera">

*Pedido de permissão de exemplo no Herdr: a pergunta, **Sim / Não / Mais…**,
**Abrir e responder**, **Espiar** e há quanto tempo o agente está esperando.*

1. Leia a pergunta no próprio card: ele mostra as últimas linhas da tela do agente,
   sem molduras nem linhas separadoras (assim aparece o comando entre as linhas
   tracejadas do Claude Code), por exemplo *"npm run db:migrate --env=staging ·
   Aplicar 3 migrações pendentes · Deseja continuar?"*.
2. **Abrir e responder** foca o terminal desse agente para você digitar a resposta.
   **Espiar** abre o terminal por cima, sem sair da aba em que você está.

**Sim / Não num pedido de permissão.** Quando a pergunta é um pedido de permissão do
Claude Code ("Do you want to proceed?") com opções escritas exatamente *Yes* e *No*,
o card também mostra **Sim** e **Não**. Cada um aperta o número dessa opção no
terminal do agente (sem Enter), como você faria; passe o mouse para ver o texto da
opção. O card então acompanha o novo status do agente: sai de **Precisa de você**
quando o agente segue. Antes de digitar, o quadro confere se o agente continua
bloqueado no mesmo pedido: lê a tela de novo e compara o pedido inteiro (todas as
linhas do diálogo, não só o trecho que o card mostra), e um botão só responde ao
pedido que o card dele mostrou; se algo mudou, não digita nada e lê a pergunta outra
vez. **Mais…**, ao lado de Sim / Não, lista as outras opções numeradas do pedido
(dígitos 1–9), como "Yes, and always allow…" ou "Yes, and switch to auto mode".
Elas podem conceder mais de uma aprovação. O menu mantém o texto do agente, inclusive
as linhas quebradas; passe o mouse sobre uma opção cortada para ler tudo. Escolher
uma opção faz a mesma conferência e aperta só o dígito dela. O menu fecha depois da
escolha, com Escape, ao clicar fora ou quando o card sai de Precisa de você ou recebe
um novo pedido. Depois de qualquer resposta, os três controles ficam apagados até o
status ou o pedido do agente mudar, então um segundo clique não digita nada. Mais…
só aparece quando há outras opções além de Sim / Não. Para outros pedidos sem um par
Yes / No simples, use **Abrir e responder**.

**Aprovação verificada de comando do Codex.** O diálogo completo de comando local
capturado com Codex CLI 0.167.0 no Linux também recebe **Sim** / **Não**, quando o
Codex reporta um pedido de permissão bloqueado. **Sim** envia `y` e aprova esse
comando uma vez. **Não** envia `esc`, cancela o pedido e interrompe o turno; digite
a próxima instrução no terminal. Nenhum acrescenta Enter, e ambos funcionam a partir
das três seleções capturadas. Os tooltips mostram a opção original e o efeito de cancelar.
A resposta direta exige a configuração de inicialização registrada nas notas de
verificação; outras configurações mantêm o fallback no terminal.
A opção persistente “don't ask again” não tem atalho no card nem entrada em **Mais…**;
use **Abrir e responder** para ela. Outros diálogos do Codex, perguntas, ambientes
remotos e telas incompletas mantêm **Abrir e responder** / **Espiar**. Se um
redimensionamento mudar as quebras do pedido, o clique atualiza o card sem enviar
teclas; confira o pedido novamente.

A extensão com `ui.confirm()` testada no pi 0.85.1 não reportou um agente bloqueado
ao Herdr e continua sem suporte. Telas iniciais/de confiança de novos agentes também
ficam sem suporte. Veja as [configurações, capturas brutas e resultados observados](issue-4-verification.md)
para a cobertura exata. O Herdboard não muda políticas de aprovação nem instala
extensões de permissão.

**Confiança na pasta ao iniciar.** A tela reconhecida do Claude Code com o título
"Accessing workspace:" também ganha um card, antes mesmo do primeiro status do
agente, inclusive em terminais estreitos onde a explicação, o caminho da pasta,
as opções ou o rodapé de confirmação quebram em várias linhas.
O card mostra a pasta: **Sim** escolhe "Yes, I trust this folder"; **Não**
escolhe "No, exit". Cada clique move da linha selecionada até a escolha e confirma
com Enter, sem atalho numérico. A dica mostra a escolha real. Se a pasta, a tela
completa, o cursor ou o processo Claude mudou, o clique não envia nada. As duas
respostas ficam desabilitadas depois do primeiro envio. Só a tela completa
reconhecida, num terminal visível com Claude em primeiro plano e ainda sem status
reportado, pode ganhar esses botões; outros terminais ou menus não são promovidos.
Reconhecer um novo pedido de confiança também traz uma aba guardada de volta ao
quadro e à contagem do cabeçalho. Reler o mesmo pedido não desfaz um novo **Guardar**,
inclusive após uma falha na validação de uma resposta.

Em uma coluna estreita, passe o mouse sobre o tempo de espera cortado para lê-lo
por completo.

Se a pergunta não estiver na tela (por exemplo, rolou para cima), o card diz
*"Abra o terminal para ver o que o agente pede."*

### Acompanhar muitos agentes

- **Todos / Este espaço** no cabeçalho: todos os agentes, ou só os do espaço ativo.
- **Fixar** (passe o mouse no card): mantém o agente no topo da coluna.
- **Guardar** (passe o mouse no card): tira a aba do quadro enquanto ela roda; ela
  volta sozinha quando um agente nela precisar de você.
- **"travado?"**: um card trabalhando há mais de 30 minutos ganha esse aviso. Espie
  para ver se ele ainda está avançando.
- **Ocioso › recolher**: recolhe a coluna Ocioso quando você só quer ver o trabalho
  ativo.
- Clique em qualquer card para ir ao espaço e à aba dele; clique num espaço do
  cabeçalho para trocar de espaço.

<img src="images/usage-hover.pt-BR.png" width="460" alt="Coluna Trabalhando: com o mouse sobre um card aparecem Espiar, Fixar e Guardar; outro card mostra o aviso travado?">

*Com o mouse sobre um card aparecem **Espiar**, **Fixar** e **Guardar**; este está
trabalhando há 47 minutos, por isso também mostra **travado?**.*

<img src="images/usage-filter.pt-BR.png" alt="Cabeçalho com Este espaço selecionado: o quadro mostra só os agentes do espaço web-app">

*Com **Este espaço** selecionado, o quadro mostra só os agentes do espaço ativo
(aqui, `web-app`).*

### Focar no terminal

**Expandir** (à direita das abas) esconde o cabeçalho e o quadro, e os terminais
ocupam a janela toda; **Restaurar** traz tudo de volta. As abas, o **+** e o **×**
continuam na barra enquanto está expandido.

<img src="images/usage-expand.pt-BR.png" alt="Expandido: só a barra de abas com Restaurar e o terminal aparecem">

*Expandido: a barra de abas (com **Restaurar** à direita) e o terminal.*

### Como ler um card

<img src="images/usage-card.pt-BR.png" width="448" alt="Um card: ícone do agente e título da tarefa em cima; espaço, aba, branch e tempo embaixo; uma faixa colorida à esquerda">

- **Faixa à esquerda**: a cor do status (aqui âmbar, Trabalhando).
- **Linha de cima**: o ícone do agente e o título da tarefa.
- **Linha de baixo**: espaço · aba · branch e, à direita, há quanto tempo ele está
  nesse status.
- **Título**: o nome que o agente deu à tarefa. Depois de um `/clear`, o card mostra
  **Última: …**, o último título que o Herdboard viu naquele terminal.
- **Tempo**: há quanto tempo ele está nesse status (*esperando há*, *há*, *concluiu
  há*).
- **Máquina**: quando há espaços remotos no Herdr, os cards mostram o nome da
  máquina do agente e identificam quem roda neste computador como **Local**, mesmo
  com **Este espaço** selecionado. Isso também aparece nas entradas compactas e nas
  linhas visíveis de Ocioso. Um quadro com agentes apenas locais e conhecidos
  mantém a apresentação habitual. **Máquina desconhecida** indica que o espaço ou
  a informação da máquina do agente está indisponível; não significa Local.
  Passe o mouse no rótulo para ler o nome completo da máquina.
- Passe o mouse no card para ver o título completo, o local, o programa e o endereço
  do terminal.
- **Worktree**: o total de arquivos pendentes no Git do worktree da pasta atual
  deste terminal, incluindo alterações feitas por qualquer pessoa. Conta alterações
  staged e unstaged, conflitos e cada arquivo não rastreado; ignora os arquivos
  marcados como ignorados. Um arquivo alterado no índice e no disco conta uma vez.
  Uma renomeação reconhecida pelo Git conta uma vez; uma movimentação ainda
  reportada como exclusão e arquivo novo conta duas. Subpastas mostram o total do
  worktree inteiro. **0 arquivos** indica uma consulta bem-sucedida sem alterações.
  **Indisponível** indica que não foi possível verificar a pasta, a máquina ou a
  consulta Git; nunca significa zero. Entradas Ociosas e o quadro compacto mostram
  o mesmo total. Passe o mouse no número para ver seu significado.

A máquina vem do próprio espaço de cada agente, então espaços de mesmo nome em
máquinas diferentes continuam separados. A identificação acompanha os dados vivos
do Herdr sem uma nova consulta de máquinas. A [verificação](issue-27-verification.pt-BR.md)
separa a associação local real no ambiente descartável, os testes simulados com
máquinas mistas e a validação nativa privada. Dados reais da conexão remota não
são publicados.

### Voltar ao layout de sempre

**⋯ › Voltar ao layout padrão** troca para o layout do próprio Herdr (um aviso
explica como voltar). `Ctrl+Shift+L` alterna os layouts; **Settings › Look ›
Layout** lista todos.

## Atalhos (com o Herdboard aberto)

| Tecla | Ação |
| --- | --- |
| `Ctrl+Shift+T` | Menu de nova aba (escolher pasta, terminal ou agente) |
| `Ctrl+Shift+K` | Buscar espaço ou aba |
| `Ctrl+Shift+W` | Fechar a aba |
| `Ctrl+Shift+B` | Mostrar / ocultar a barra lateral do Herdr |
| `Ctrl+Shift+L` | Trocar de layout |

## Bom saber

- O que roda além do desenho: o quadro executa `hc read <terminal> --lines 0` (a
  linha de comando do próprio Herdr) a cada bloqueio, para ler a pergunta do agente;
  se essa leitura não a encontrar (a pergunta ainda não está na tela ou, num pedido
  de permissão elegível do Claude/Codex, falta o Sim / Não verificado), lê até mais duas vezes, 0,5 s
  depois e, de novo, 1,5 s depois disso, só enquanto o agente continuar bloqueado.
  Lê de novo quando você clica em Sim / Não ou escolhe uma opção de Mais… e envia as
  teclas verificadas daquele diálogo (`hc keys <terminal> <dígito>` para permissões
  do Claude, `y` ou `esc` para Codex); a busca executa `hc machine ls`, como a busca original do Herdr; o menu de
  nova aba pergunta ao Herdr quais agentes estão instalados. A descoberta inicial
  também lê os terminais Claude elegíveis aproximadamente a cada segundo enquanto
  o quadro está visível; uma resposta inicial consulta `hc get` antes e depois da
  leitura da tela e envia as setas e o Enter juntos. As respostas ao Codex também
  consultam `hc get` antes e depois dessa leitura para confirmar processo, pasta,
  configuração e report de permissão bloqueado. O total Git também executa
  `git rev-parse --absolute-git-dir` e
  `git --no-optional-locks status --porcelain=v1 -z --untracked-files=all --ignored=no --renames`
  na máquina e na pasta atual do próprio terminal do card. O Git inspeciona o
  worktree; o quadro não exibe conteúdos de arquivos nem diffs. Nenhum mod baixa
  nada da internet.
- As consultas Git têm **intervalo mínimo de 10 segundos** por consulta equivalente
  e no máximo **dois comandos físicos** em andamento, incluindo a descoberta.
  A descoberta é compartilhada por máquina e pasta; o status, por máquina e
  worktree Git canônico, mesmo em subpastas. Worktrees vinculados ficam separados.
  Descobertas bem-sucedidas ficam em cache enquanto houver cards visíveis usando
  a pasta. Consultas lentas ocupam a vaga até terminar; falhas esperam o intervalo.
  Não há fila de retentativas; até 128 intervalos recentes são mantidos por um
  período. Muitos worktrees diferentes podem aumentar a espera pelo total.
  Só a instância do quadro consulta. Filtros, Guardar, Ociosos recolhidos e ocultar
  ou expandir o quadro suspendem consultas sem consumidor visível. Ao voltar, o
  card espera um resultado atual. O [registro de verificação](issue-26-verification.pt-BR.md)
  separa medições de execução nativa dos testes de runtime simulado.
- A janela do Espiar e a barra lateral são do próprio Herdr e ficam em inglês.
- O Herdr não permite mudar a pasta registrada de um espaço depois de criado; o
  Herdboard sempre usa a pasta atual dos terminais.
- As preferências ficam no estado compartilhado do Herdr, em `herdboard.*`.

## Perguntas frequentes

**O card diz "Sem título da tarefa".** O agente ainda não deu nome a uma tarefa
(por exemplo, numa sessão em que você só disse "olá"). O título é o que o agente
define no terminal dele: nos nossos testes, o Claude Code o definiu quando começou a
trabalhar numa tarefa. A partir daí, o Herdboard guarda o título mesmo depois de um
`/clear`.

**A nova aba abriu na pasta errada.** Novas abas começam onde o terminal da aba
ativa *está*, não onde o agente trabalha: um agente iniciado em `~/projetos` que roda
`cd meu-app && …` dentro dos comandos continua em `~/projetos`. Escolha o projeto em
**Abrir em**, no menu do **+**, ou inicie os agentes por esse menu para que eles já
comecem na pasta do projeto.

**O tempo de um card parece errado.** O Herdr registra os tempos por aba. Quando uma
aba tem mais de um agente, o Herdboard conta a partir de quando viu o status de cada
um.

**Dá para mudar o limite de 30 minutos do "travado?"?** Sim: `STUCK_MIN` no início
de `mods/herdboard/main.js`; depois rode `scripts/install.sh` de novo.

**Funciona com temas claros?** Sim. Todas as cores vêm do tema do seu Herdr.

## Atualizar

```sh
herdboard/scripts/update.sh
```

Ele avança o seu clone (`git pull --ff-only`) e roda `scripts/install.sh` de novo.
O Herdr recarrega o layout e os mods sozinho; não precisa reiniciar. Para ver quais
arquivos uma instalação sobrescreveria, rode `scripts/install.sh --dry-run`: ele lista
cada arquivo como **new** (novo), **overwrite** (sobrescreve) ou **unchanged** (igual),
diz o que aconteceria com o `keys.json` e não muda nada.

Se você editou algum arquivo do clone (o `STUCK_MIN`, por exemplo), a atualização
para antes do pull e lista o que você mudou. Para manter as suas edições, rode
dentro do clone:

```sh
git stash && scripts/update.sh && git stash pop && scripts/install.sh
```

Se parar no meio, as suas edições continuam guardadas no stash; `git stash pop` as
traz de volta. Se preferir fazer commit delas, a atualização não consegue avançar
direto quando o Herdboard também tiver commits novos: rode
`git pull --rebase && scripts/install.sh` no lugar dela. A atualização também para,
sem instalar, sempre que o seu branch não pode avançar direto (há commits seus e
commits novos do Herdboard, ou ele não acompanha nenhum branch remoto), e avisa.

## Desinstalar

```sh
herdboard/scripts/uninstall.sh
```

Ele encontra a pasta do Herdr do mesmo jeito que a instalação e remove
`layouts/herdboard.json`, as pastas `mods/herdboard`, `mods/herdboard-picker` e
`mods/herdboard-new-menu` e a seção `"layout:herdboard"` do `keys.json`, fazendo antes
um backup do `keys.json` em `keys.json.before-herdboard-uninstall` (se essa seção era
tudo o que ele tinha, o `keys.json` é apagado). Seus outros layouts, mods e atalhos não
mudam. O que já não existe é pulado, então rodar duas vezes não faz mal. Se o Herdboard
era o seu layout ativo, troque para outro no Herdr (**Settings › Look › Layout**) ou
com `Ctrl+Shift+L`.

Para ver antes o que seria removido, rode `scripts/uninstall.sh --dry-run`: ele lista
cada arquivo, pasta e mudança no `keys.json`, e não muda nada.
