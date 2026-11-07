# Contributing

**English** · [Português (Brasil)](#português-brasil)

## Report a bug or suggest an idea

Open an [issue](https://github.com/TJbarros/herdboard/issues/new/choose) with the
bug or idea form. For bugs, include your herdr-app version (`herdr-app --version`),
your system (Windows with WSL or Git Bash, Linux or macOS), the steps and what you
expected.
Screenshots help; leave out project names or anything private.

## Change the code

1. Edit the files in this repository (`layouts/`, `mods/`).
2. Install your copy: `scripts/install.sh`. Herdr reloads mods and layouts by itself.
3. Run every check: `scripts/check.sh` (needs `herdr-app` and Node 22+). It runs
   `herdr-app check` on each mod in `mods/`, then the tests (`node --test`), and
   names any step that failed.
4. Try it in Herdr, in both languages (PT | EN in the header), at a narrow and a wide
   window.
5. Every text shown in the board goes in both tables of `mods/herdboard/main.js`
   (`TEXT.pt` and `TEXT.en`).
6. Docs change with the code, in English and Portuguese, and only state what you
   checked in the code or tried in the app.

## Português (Brasil)

### Relatar um problema ou sugerir uma ideia

Abra uma [issue](https://github.com/TJbarros/herdboard/issues/new/choose) pelo
formulário de problema ou de ideia. Em problemas, informe a versão do herdr-app
(`herdr-app --version`), o seu sistema (Windows com WSL ou Git Bash, Linux ou macOS),
os passos e o
que você esperava. Prints ajudam; deixe de fora nomes de projetos ou dados privados.

### Mudar o código

1. Edite os arquivos deste repositório (`layouts/`, `mods/`).
2. Instale a sua cópia: `scripts/install.sh`. O Herdr recarrega mods e layouts sozinho.
3. Rode todas as verificações: `scripts/check.sh` (precisa do `herdr-app` e do
   Node 22+). Ele roda `herdr-app check` em cada mod de `mods/`, depois os testes
   (`node --test`), e diz qual passo falhou.
4. Teste no Herdr, nos dois idiomas (PT | EN no cabeçalho), com a janela estreita e
   larga.
5. Todo texto exibido no quadro vai nas duas tabelas de `mods/herdboard/main.js`
   (`TEXT.pt` e `TEXT.en`).
6. A documentação muda junto com o código, em inglês e em português, e só afirma o
   que você conferiu no código ou testou no app.
