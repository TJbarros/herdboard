<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="Logo do Herdboard"></p>

<h1 align="center">Herdboard</h1>

<p align="center"><a href="README.md">English</a> · <b>Português (Brasil)</b></p>

Um quadro kanban dos seus agentes de código, como layout do [Herdr](https://herdr.dev).
Cada agente de cada espaço vira um card em quatro colunas: Precisa de você,
Trabalhando, Concluído e Ocioso. Os cards bloqueados mostram o que o agente está
perguntando; os terminais ao vivo da aba ativa ocupam o resto da janela.

![Herdboard](preview.pt-BR.png)

## O que ele faz

- **Kanban de agentes.** Quatro colunas iguais, cards empilhados; o quadro cresce
  com a coluna mais cheia (140–360px) e cada coluna rola sozinha.
- **Cards que dizem o que está acontecendo.** Ícone do agente e título da tarefa;
  embaixo, espaço · aba · branch e há quanto tempo ele está naquele status. Um
  agente trabalhando há mais de 30 minutos ganha o aviso "travado?". O último título
  da tarefa fica guardado, então sobrevive a um `/clear`.
- **"Precisa de você", respondido pelo quadro.** O card bloqueado mostra a pergunta
  da tela do agente (`hc read --lines 0`: só a parte visível, sem rolar e sem enviar
  teclas), com *Abrir e responder* e *Espiar*.
- **Ações ao passar o mouse.** Espiar (o terminal por cima, sem trocar de aba),
  Fixar (topo da coluna), Guardar (tira a aba do quadro até um agente nela precisar
  de você).
- **Ocioso ocupa pouco.** Agentes ociosos viram linhas compactas (ícone, tarefa,
  onde, tempo) e a coluna pode ser recolhida.
- **Cabeçalho em uma linha.** Espaços (todos, com ou sem agentes), filtro Todos /
  Este espaço, busca, seletor PT / EN e um menu ⋯ (novo espaço, nova aba, voltar ao
  layout padrão do Herdr). A barra lateral do próprio Herdr fica recolhida à
  esquerda.
- **Barra do workspace.** As abas do espaço ativo, um **+** que abre o menu de nova
  aba, fechar na aba ativa, o programa exibido e Expandir (os terminais ocupam a
  janela toda).
- **Novas abas na pasta certa.** O menu de nova aba abre abas, agentes e espaços na
  pasta atual do terminal da aba ativa, e deixa escolher outra pasta de projeto entre
  os terminais abertos.
- **Segue o seu tema**, claro ou escuro. **Responsivo** até ~760px (uma lista única
  abaixo de 800px).
- **Dois idiomas:** inglês e português (Brasil), com troca no cabeçalho.

## Instalação

Requer o Herdr (testado com herdr-app 0.1.13).

```sh
git clone https://github.com/TJbarros/herdboard.git
cd herdboard
scripts/install.sh            # no WSL, ele encontra a pasta do Herdr do Windows
```

Depois, no Herdr: **Settings › Look › Layout › Herdboard**, ou
`herdr-app do layout.switch --name herdboard`. `Ctrl+Shift+L` volta para os seus
outros layouts. O `scripts/install.sh` só copia arquivos e adiciona a seção
`layout:herdboard` ao `keys.json` (com backup) quando ela ainda não existe.

Para instalar manualmente, copie `layouts/herdboard.json` para
`~/.config/herdr-app/layouts/`, as três pastas `mods/herdboard*` para
`~/.config/herdr-app/mods/` e junte o `keys.json` ao seu.

## Como usar

### Iniciar um agente no projeto certo

1. Clique no **+** ao lado das abas (ou aperte `Ctrl+Shift+T`).
2. Em **Abrir em**, escolha a pasta do projeto. A primeira é onde a aba ativa está
   agora; as outras são as pastas dos seus outros terminais abertos.
3. Escolha **Terminal** ou um agente (Claude Code, Codex, Gemini…). A nova aba abre
   nessa pasta, no espaço atual.

<img src="docs/images/usage-new-tab.pt-BR.png" width="302" alt="Menu de nova aba: Abrir em lista as pastas de projeto, depois Terminal e os agentes instalados">

*O menu do **+**: escolha a pasta em **Abrir em** e depois um terminal ou um agente.*

Precisa de um projeto novo? **⋯ › Novo espaço** cria um espaço na pasta da aba
ativa; **+ › Novo espaço** cria na pasta escolhida em **Abrir em**. Os dois ficam na
mesma máquina do espaço ativo.

### Responder um agente que precisa de você

Quando um agente para e pergunta algo, o card dele vai para **Precisa de você** e a
coluna fica vermelha. Se ele estiver em outro espaço, esse espaço também fica vermelho
no cabeçalho.

<img src="docs/images/usage-needs-you.pt-BR.png" width="470" alt="Coluna Precisa de você com um card bloqueado mostrando a pergunta do agente e os botões Abrir e responder e Espiar">

*Um agente bloqueado: a pergunta dele, **Abrir e responder**, **Espiar** e há quanto
tempo ele está esperando.*

1. Leia a pergunta no próprio card: ele mostra as últimas linhas da tela do agente,
   por exemplo *"npm run db:migrate --env=staging · Aplicar 3 migrações pendentes ·
   Deseja continuar?"*.
2. **Abrir e responder** foca o terminal desse agente para você digitar a resposta.
   **Espiar** abre o terminal por cima, sem sair da aba em que você está.

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

<img src="docs/images/usage-hover.pt-BR.png" width="460" alt="Coluna Trabalhando: com o mouse sobre um card aparecem Espiar, Fixar e Guardar; outro card mostra o aviso travado?">

*Com o mouse sobre um card aparecem **Espiar**, **Fixar** e **Guardar**; este está
trabalhando há 47 minutos, por isso também mostra **travado?**.*

<img src="docs/images/usage-filter.pt-BR.png" alt="Cabeçalho com Este espaço selecionado: o quadro mostra só os agentes do espaço web-app">

*Com **Este espaço** selecionado, o quadro mostra só os agentes do espaço ativo
(aqui, `web-app`).*

### Focar no terminal

**Expandir** (à direita das abas) esconde o cabeçalho e o quadro, e os terminais
ocupam a janela toda; **Restaurar** traz tudo de volta. As abas, o **+** e o **×**
continuam na barra enquanto está expandido.

<img src="docs/images/usage-expand.pt-BR.png" alt="Expandido: só a barra de abas com Restaurar e o terminal aparecem">

*Expandido: a barra de abas (com **Restaurar** à direita) e o terminal.*

### Como ler um card

<img src="docs/images/usage-card.pt-BR.png" width="448" alt="Um card: ícone do agente e título da tarefa em cima; espaço, aba, branch e tempo embaixo; uma faixa colorida à esquerda">

- **Faixa à esquerda**: a cor do status (aqui âmbar, Trabalhando).
- **Linha de cima**: o ícone do agente e o título da tarefa.
- **Linha de baixo**: espaço · aba · branch e, à direita, há quanto tempo ele está
  nesse status.
- **Título**: o nome que o agente deu à tarefa. Depois de um `/clear`, o card mostra
  **Última: …**, o último título que o Herdboard viu naquele terminal.
- **Tempo**: há quanto tempo ele está nesse status (*esperando há*, *há*, *concluiu
  há*).
- Passe o mouse no card para ver o título completo, o local, o programa e o endereço
  do terminal.

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
  linha de comando do próprio Herdr) uma vez a cada bloqueio, para ler a pergunta do
  agente; a busca executa `hc machine ls`, como a busca original do Herdr; o menu de
  nova aba pergunta ao Herdr quais agentes estão instalados. Nenhum mod baixa nada
  da internet nem lê seus arquivos.
- A janela do Espiar e a barra lateral são do próprio Herdr e ficam em inglês.
- O Herdr não permite mudar a pasta registrada de um espaço depois de criado; o
  Herdboard sempre usa a pasta atual dos terminais.
- As preferências ficam no estado compartilhado do Herdr, em `herdboard.*`.

## Perguntas frequentes

**O card diz "Sem título da tarefa".** O agente ainda não deu nome a uma tarefa
(por exemplo, numa sessão em que você só disse "olá"). Agentes como o Claude Code
definem o título quando começam a trabalhar numa tarefa; a partir daí, o Herdboard
guarda o título mesmo depois de um `/clear`.

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
cd herdboard
git pull
scripts/install.sh
```

O Herdr recarrega o layout e os mods sozinho; não precisa reiniciar.

## Desinstalar

Troque para outro layout e apague `layouts/herdboard.json` e as pastas
`mods/herdboard`, `mods/herdboard-picker` e `mods/herdboard-new-menu` da pasta do
Herdr (`~/.config/herdr-app`); depois remova a seção `"layout:herdboard"` do
`keys.json` dela. Seus outros layouts e atalhos não mudam.

## Licença

Apache License 2.0. Derivado do exemplo `board` de
[herdr-layout-examples](https://github.com/herdrdev/herdr-layout-examples) e de mods
que acompanham o Herdr; veja o [NOTICE](NOTICE).
