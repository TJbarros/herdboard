# Checagem de tipos do Herdboard

[English](typechecking.md). Diagnóstico registrado em 2026-11-09.

Instale as dependências de desenvolvimento com `npm ci` e execute
`scripts/check.sh`. Essa verificação gera as declarações nativas em cada check de
mod, roda o compilador estrito nos três mods e executa a suíte Node. Depois de
geradas as declarações, `npm run typecheck` verifica somente os tipos. O lockfile
fixa TypeScript 5.9.3; `node_modules` não é instalado no app do usuário.

## Diagnóstico

No commit `48a128e`, a configuração gerada do quadro apontava **387 erros no
código-fonte**; menu e seletor também falhavam nas verificações independentes.
O check inicial da issue #29 não executava o compilador. Portanto, sua aprovação
não demonstrava um typecheck aprovado. Uma regressão do check agora reproduz essa
omissão.

Três sondagens separaram as causas:

1. Selecionar a biblioteca ES2023 eliminou os diagnósticos de `findLast` e
   `findLastIndex`. Os `tsconfig.json` versionados descrevem essas funções já
   usadas no runtime, preservando explicitamente as configurações geradas do Herdr.
2. Declarar o formato real da paleta eliminou os acessos a propriedades de `{}` e
   revelou o contrato de cor: o mapa genérico de strings do Herdr precisa ser
   validado como cor `#...` do GPUI antes de construir os elementos.
3. Contratos explícitos de parser, worktree, estado do quadro e callbacks
   eliminaram parâmetros implícitos, arrays de opções ambíguos, acessos a mapas e
   tuplas de callbacks. Resultados do parser e linhas do seletor têm variantes
   discriminadas.

Nenhum arquivo da aplicação usa `@ts-ignore`, `@ts-nocheck` ou `any` como escape.
As opções estritas existentes foram mantidas, inclusive `strictNullChecks: false`
escolhido pelo Herdr para seu ciclo de vida. Nenhuma opção de diagnóstico foi
afrouxada para obter aprovação. A configuração versionada preserva explicitamente
o padrão anterior do `jsconfig` de não validar declarações de dependências. Essa
política não mudou: o JS da aplicação e o arquivo próprio `types.ts` são
verificados. `gpui-kit.d.ts` e eventuais `jsconfig.json` locais continuam ignorados
e sem edições; o typecheck não depende de um `jsconfig.json` local.

A regressão em cópia limpa é necessária porque o Herdr não gera `jsconfig.json`
quando já existe um `tsconfig.json`. Por isso, cada mod tem uma configuração
completa, sem estender um arquivo local ignorado.

## Interfaces e dados do runtime

`parseAsk` e `WorktreeChanges` mantêm interfaces pequenas, resultados explícitos e
seus testes de comportamento existentes. Os contratos do quadro ficam em
`types.ts`, sem editar declarações nativas. Na seam dos dados nativos, o adapter
`herdr-state.js` valida terminal, report, programa e tema. Fatos opcionais
indisponíveis permanecem ausentes; reports parciais de permissão mantêm seu
significado suportado. Títulos lembrados e agentes em cache são validados antes
do uso. O seletor valida respostas de máquinas, cores salvas e zoom numérico.

O Herdr trata cada mod como uma aplicação isolada e rejeita imports de runtime de
um mod vizinho. Por isso, os pequenos adapters de tema/dados são locais a cada
mod, sem dependência de runtime entre diretórios nem novo requisito de instalação.

## Regressões

- Os testes existentes de permissão, startup, Cursor, atividade, worktree e
  associação protegem o comportamento durante a tipagem.
- Os testes do check completo exigem falha se houver erro de tipos, sem deixar de
  verificar os demais mods nem de executar os testes Node. A ausência do
  compilador também falha, com a instrução `npm ci`.
- Um teste com o compilador real exclui a configuração local ignorada, aprova uma
  cópia temporária do quadro e depois
  adiciona `div().text_color("red")` somente nela. Ele exige TS2345 e saída
  diferente de zero, demonstrando que os erros de chamadas nativas são detectados.

Checks nativos e a nova verificação do quadro/navegação em EN/PT, estreito/largo,
usam app, core e display isolados. Os checks de menu e seletor usam seus próprios
diretórios, incluindo a restrição de imports do runtime do Herdr.

A verificação completa final aprovou os três checks nativos, os três typechecks e
**509 testes**. O mesmo check também passou em um arquivo limpo da árvore
versionada, inicialmente sem declarações geradas nem configs locais. O Herdr
gerou as três declarações, sem precisar de `jsconfig.json`. Os [resultados](evidence/typechecking/checks.json) e as
[quatro observações de navegação](evidence/typechecking/native-navigation.json)
incluem o teste negativo com o compilador real. Capturas nativas:
[EN largo](evidence/typechecking/en-1280.png),
[PT largo](evidence/typechecking/pt-1280.png),
[EN estreito](evidence/typechecking/en-760.png),
[PT estreito](evidence/typechecking/pt-760.png),
[menu de nova aba](evidence/typechecking/new-menu-pt-760.png) e
[seletor](evidence/typechecking/picker-pt-760.png).
