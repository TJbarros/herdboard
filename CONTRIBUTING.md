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
3. Install the development compiler with `npm ci` (Node 22+), then run
   `scripts/check.sh` (also needs `herdr-app`). It runs `herdr-app check` on each
   mod, strict TypeScript checking and the tests (`node --test`), and names any
   step that failed. Native checks generate the ignored runtime declarations;
   each versioned `tsconfig.json` contains the complete ES2023 configuration.
   After that setup, `npm run typecheck` runs the compiler alone.
4. Try it in Herdr, in both languages (PT | EN in the header), at a narrow and a wide
   window.
5. Every text shown in the board goes in both tables of `mods/herdboard/main.js`
   (`TEXT.pt` and `TEXT.en`).
6. Docs change with the code, in English and Portuguese, and only state what you
   checked in the code or tried in the app.

New direct-answer formats need a versioned evidence bundle before enabling them:
raw wide/narrow `hc read --lines 0` captures, paired `hc get --json`, the app's
`agents()` / `terminals()` snapshot, versions, effective settings and independently
observed results for each exposed key plan. Record persistent approval and
cancellation effects separately. See [issue #4 verification](docs/issue-4-verification.md).
Fixtures and the real `main.js` harness cover recognition, exact keys and races;
native PT/EN narrow/wide checks cover controls and outcomes. Unsupported dialogs
keep the fallback; never invent reports or infer another agent's keys.

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
3. Instale o compilador de desenvolvimento com `npm ci` (Node 22+) e rode
   `scripts/check.sh` (também precisa do `herdr-app`). Ele executa os checks
   nativos dos mods, a checagem estrita de TypeScript e os testes (`node --test`),
   e diz qual passo falhou. Os checks nativos geram as declarações ignoradas;
   cada `tsconfig.json` versionado contém a configuração ES2023 completa.
   Depois dessa preparação, `npm run typecheck` roda somente o compilador.
4. Teste no Herdr, nos dois idiomas (PT | EN no cabeçalho), com a janela estreita e
   larga.
5. Todo texto exibido no quadro vai nas duas tabelas de `mods/herdboard/main.js`
   (`TEXT.pt` e `TEXT.en`).
6. A documentação muda junto com o código, em inglês e em português, e só afirma o
   que você conferiu no código ou testou no app.

Novos formatos de resposta direta precisam de evidências versionadas antes de serem
habilitados: capturas brutas largas/estreitas de `hc read --lines 0`, `hc get --json`
pareado, snapshot de `agents()` / `terminals()` do app, versões, configuração efetiva
e resultado observado de cada sequência exposta. Registre os efeitos de aprovação
persistente e cancelamento separadamente. Veja a [verificação da issue #4](docs/issue-4-verification.md).
Fixtures e o harness real de `main.js` cobrem reconhecimento, teclas exatas e corridas;
o teste nativo em PT/EN nas duas larguras cobre os controles e resultados. Diálogos
sem suporte mantêm o fallback; não invente reports nem deduza teclas de outro agente.
