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

## Atalhos (com o Herdboard aberto)

| Tecla | Ação |
| --- | --- |
| `Ctrl+Shift+T` | Menu de nova aba (escolher pasta, terminal ou agente) |
| `Ctrl+Shift+K` | Buscar espaço ou aba |
| `Ctrl+Shift+W` | Fechar a aba |
| `Ctrl+Shift+B` | Mostrar / ocultar a barra lateral do Herdr |
| `Ctrl+Shift+L` | Trocar de layout |

## Bom saber

- O mod executa `hc read` (a linha de comando do próprio Herdr) uma vez a cada
  bloqueio, para ler a pergunta do agente. Ele não acessa a rede, não executa outros
  programas e não lê arquivos fora da própria pasta.
- A janela do Espiar e a barra lateral são do próprio Herdr e ficam em inglês.
- O Herdr não permite mudar a pasta registrada de um espaço depois de criado; o
  Herdboard sempre usa a pasta atual dos terminais.
- As preferências ficam no estado compartilhado do Herdr, em `herdboard.*`.

## Licença

Apache License 2.0. Derivado do exemplo `board` de
[herdr-layout-examples](https://github.com/herdrdev/herdr-layout-examples) e de mods
que acompanham o Herdr; veja o [NOTICE](NOTICE).
