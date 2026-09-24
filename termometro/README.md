# Termômetro

O caderno de contas da planilha, virado app. Entradas, saídas e o saldo de cada
dia, no iPhone e no computador, com os dois sempre iguais.

Não é um app de finanças genérico: é a aba de um ano da **Planilha do Breno —
Termômetro**, com a mesma lógica, o mesmo rodapé e a mesma pergunta no centro —
**dá até o fim do mês?**

Quem quer só colocar no ar, sem mexer em código: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).

## A lógica, que é a da planilha

Cada dia tem três colunas — **Entrada**, **Saída** e **Diário** — e um saldo que
anda linha a linha:

    saldo do dia = saldo de ontem + Entrada − (Saída + Diário)

O saldo atravessa o mês e vira para o mês seguinte; janeiro começa no saldo de
abertura do ano. Por isso o cálculo é sempre do ano inteiro de uma vez: pedir
"só março" seria pedir um número que depende de janeiro.

O rodapé de cada mês traz o que a planilha trazia: entradas, saídas, diário,
saída total, média por dia, entrada sua (sem repasse de fora), investido e
quanto isso é da sua entrada, o rateio do apartamento, performance e saldo de
fechamento.

O motor está em [`src/lib/calculo.ts`](src/lib/calculo.ts) — função pura, sem
banco e sem tela. É a única fonte dos números, e `src/lib/calculo.test.ts`
tranca cada regra.

### Três coisas que a planilha fazia errado, e aqui não

Não é implicância: cada uma mudava um número que se olhava para decidir alguma
coisa.

1. **A média diária dividia por 30 fixo.** Em janeiro, que tem 31 dias, ela
   somava os 31 e dividia por 30 — o gasto médio saía maior do que foi. Aqui
   divide pelos dias que o mês tem.
2. **Janeiro não tinha a soma das entradas.** A célula simplesmente não existia,
   e a "performance" do mês saía como se nada tivesse entrado no ano inteiro.
3. **Havia dinheiro lançado num dia 31 de novembro.** A linha existia na
   planilha porque todo mês tinha 31 linhas; novembro não tem 31 dias. O valor
   entrava na conta do ano, mas ficava fora do último dia do mês. Na importação
   ele desce para o dia 30, e o app avisa que fez isso.

## Categorias: para onde o dinheiro foi

O saldo responde "quanto sobrou". A categoria responde **"sobrou pouco por
quê"** — e é a segunda que faz alguém mudar alguma coisa, porque ela aponta um
lugar onde dá para mexer.

Cada lançamento guarda uma categoria (ou nenhuma, que é resposta válida e é como
estão os 815 que vieram da planilha). A aba **Totais** soma por ela, uma coluna
por vez: entrada e saída não se comparam na mesma lista, e o que se quer saber é
sempre "das minhas saídas, quanto foi para o apartamento".

Três decisões que essa parte carrega:

- **A categoria é texto no lançamento, não uma tabela com chave estrangeira.**
  São umas quinze, escolhidas numa lista de botões. Uma tabela cobraria uma
  junção em toda leitura e deixaria linha órfã a cada renomeação. A lista mora
  em `Ajuste`, que já sincroniza.
- **Uma categoria vale em mais de uma coluna.** "Transporte" é gasto do dia a
  dia quando é o aplicativo da esquina e é saída quando é o seguro do carro.
  Amarrar cada categoria a uma coluna obrigaria a inventá-la duas vezes, com
  dois totais que ninguém quer separados.
- **Apagar uma categoria não apaga o passado dela.** O lançamento guarda o
  identificador; se a categoria some da lista, o identificador vira o nome e a
  linha continua nos totais.

A lista já vem preenchida ([`src/lib/categorias.ts`](src/lib/categorias.ts)). Uma
tela vazia pedindo que alguém invente um sistema de classificação antes de poder
lançar um almoço é o jeito mais seguro de ninguém classificar nada — e o palpite
é todo editável em Ajustes. **Renomear troca só o nome, nunca o identificador**,
que é o que está gravado em cada lançamento: corrigir "Mercado" para
"Supermercado" renomeia também nos totais de janeiro.

### Classificar o passado

Os lançamentos que vieram da planilha nasceram sem categoria — ninguém escreveu
essa informação lá. Um por um, 815 vezes, ninguém classifica, e a aba Totais
ficaria para sempre dizendo "sem categoria, 96%", que é o mesmo que não ter
categoria nenhuma.

A saída é a nota ([`src/lib/classificar.ts`](src/lib/classificar.ts)). A planilha
repetia "aluguel" doze vezes, "salário" doze vezes — e quem diz "aluguel" uma vez
está dizendo das doze. Juntados por tipo e nota, centenas de lançamentos viram
**uma dúzia de decisões**, ordenadas do maior para o menor em dinheiro: é onde
está o que muda a resposta da tela, e é por onde vale começar quando a paciência
dá para três toques.

O convite mora em dois lugares e some sozinho quando não sobra nada: em Ajustes,
e na própria linha "Sem categoria" da aba Totais — exatamente onde ela incomoda.

## As abas

**Hoje** é onde o app abre. Responde as duas perguntas de quem está com o
celular na mão depois de gastar algo: quanto eu tenho, e quanto ainda posso
gastar. A segunda é uma conta de verdade, não um palpite:

    dá por dia = (saldo de ontem + o que ainda entra − o que ainda sai
                  − o que já gastei hoje) ÷ dias que faltam no mês

As contas que ainda vêm entram na conta; o gasto do dia a dia *previsto* não —
é justamente ele que está sendo calculado. Arredonda para baixo, porque é melhor
sobrar do que faltar. Está em `sobraPorDia`, em
[`src/lib/calculo.ts`](src/lib/calculo.ts), com os testes em
[`src/lib/sobra.test.ts`](src/lib/sobra.test.ts).

**Mês** é a planilha: cinco colunas — dia, entrada, saída, diário, saldo — uma
cor por coluna, e o dia de hoje marcado com uma barra azul, para o qual a lista
já abre rolada. O mesmo mês também se vê em **calendário**, ocupando a largura
inteira, com os três valores e o saldo dentro de cada célula: a lista responde
como o saldo chegou até aqui, o calendário responde qual é a forma deste mês.

**Totais** é para onde o dinheiro foi, por categoria, num mês ou no ano inteiro.
**O que vem** é tudo o que está marcado daqui até o fim do ano, sem o gasto do
dia a dia — ele não é compromisso, é o que sobra depois deles.

A barra de baixo tem cinco nomes, e a escolha de quem fica nela não é por
importância e sim por postura: Hoje, Mês, Totais e O que vem se olham de pé, na
fila do mercado. **Ano**, **Fixos** e **Ajustes** se olham sentado, e vivem atrás
de **Mais** — um toque a mais não custa nada para quem já sentou.

### O computador não é um celular grande

A partir de 1024 px a barra de baixo dá lugar a um **menu lateral**, e as duas
nunca aparecem juntas: duas navegações na mesma tela são duas respostas para
"onde eu estou". Na lateral cabem todos os destinos, porque esconder Ano, Fixos
e Ajustes atrás de "Mais" é uma conta do celular — repeti-la num monitor seria
economizar espaço que sobra. O botão de lançar também muda de papel: na barra
ele aparece em duas telas, na lateral vale para todas.

O espaço que sobra vira segunda coluna onde ela responde alguma coisa:

- **Mês**: o rodapé sobe para o lado da tabela. Empilhado, ele ficava depois de
  trinta linhas — e é justamente o resumo que se quer olhar *junto* com elas.
- **Totais**: o período e o total ficam fixos à esquerda enquanto a lista de
  categorias rola.
- **Hoje**: o saldo e os botões à esquerda, o que foi lançado à direita.
- **O que vem** e **Classificar**: duas colunas de cartões, porque são listas
  longas de coisas independentes.

O que não ganha nada com a largura — Ano, Fixos, Ajustes — fica centralizado e
com a mesma medida de leitura. Esticar um formulário até 1.400 px não o torna
melhor; torna-o mais difícil de ler.

A previsão dos fixos vai até **dezembro do ano seguinte**, não até dezembro
deste. Em outubro, "até dezembro" são dez semanas de futuro — pouco para decidir
qualquer coisa que atravesse o Ano-Novo, e a vida atravessa.

O ano vira sozinho. Um ano começa onde o anterior terminou, e o app encadeia os
anos que tem em vez de esperar alguém digitar o saldo de abertura em 1º de
janeiro. Um saldo digitado à mão continua valendo e interrompe a corrente — é
como se conserta uma diferença sem mexer no passado.

## O teclado é do app, não do iPhone

O teclado numérico do iOS **não tem a tecla de mais**. Enquanto o valor era um
campo de texto comum, a soma que a planilha ensinou — `195+15+83` — só
funcionava em computador.

Por isso o lançamento tem teclado próprio, com `+ − × ÷` e um visor que mostra o
resultado enquanto se digita. Os dois tipos de sinal fazem coisas diferentes, de
propósito:

- **`+` separa em vários lançamentos**, como a planilha fazia dentro da célula:
  `195 + 15 + 83` vira três linhas, cada uma com sua nota, que dá para apagar
  sozinha.
- **`× − ÷` são conta dentro de um valor só**: `3 × 50` é um lançamento de 150.

O leitor da conta é puro e vive em
[`src/lib/calculadora.ts`](src/lib/calculadora.ts) — ele recusa valor negativo e
divisão por zero, e o teclado nunca deixa digitar dois operadores seguidos.

## Trazer a planilha para dentro

Em **Ajustes → Importar planilha**, escolhendo o `.xlsx`. O arquivo é lido no
próprio aparelho — ele não sobe para servidor nenhum; o que vai para o banco são
os lançamentos já lidos.

A leitura ([`src/lib/planilha.ts`](src/lib/planilha.ts)) recupera o que estava
guardado em forma de célula:

- **`=195+15+83`** numa célula eram três gastos no mesmo dia. Viram três
  lançamentos separados, cada um com sua nota, que dá para apagar sozinho.
- **O comentário amarelo** da célula ("pagamento fatura", "seguro do carro")
  vira a nota do lançamento.
- **As marcações escondidas no rodapé.** A linha "ENTRADA S/ $PAI" apontava a
  dedo, célula por célula, quais entradas eram dinheiro seu (`=C16`, `=I21+I5`).
  Essas referências são lidas, e as entradas citadas chegam marcadas. O mesmo
  vale para o "INVESTIDO %", que apontava a saída do investimento, e para
  "Saídas Apto".
- **Conta de verdade** (`=D11*0,4`, `=11473-10000`) entra pelo valor calculado,
  com a fórmula preservada na nota — nada se perde.

`npm test` roda as verificações com uma planilha de mentira montada no próprio
teste. Para conferir contra a planilha de verdade, que tem dinheiro dentro e por
isso **não mora neste repositório**:

```sh
PLANILHA=~/Downloads/Termometro.xlsx npm test
```

Esse teste importa a aba e compara, mês a mês, com os números que a própria
planilha mostrava. Os doze meses de 2026 batem ao centavo.

## O termômetro mede o futuro

Em **Fixos** ficam as coisas que se repetem: o salário do dia 5, a fatura do dia
10, os 60 reais de todo dia — e também a diarista de **toda primeira quarta** e o
boleto do **último dia útil**. "Dia 5" dá conta do salário e não dá conta de
metade do resto; escrever a feira de sábado como um dia do mês obriga a corrigir
à mão todo mês, que é o mesmo que não ter fixo nenhum.

As regras vivem em [`src/lib/repeticao.ts`](src/lib/repeticao.ts), como função
pura. Não há "a cada N dias" de propósito: ela precisa de uma data-âncora, e uma
âncora que ninguém vê é fonte de surpresa. Dia útil é de segunda a sexta,
**sem feriado** — uma tabela de feriados nacionais, estaduais e municipais é um
problema que não acaba, e errar por excesso de zelo seria pior do que a regra
simples e anunciada.

O campo `dia` continua no banco como **recuo**: um fixo cadastrado antes de
existirem regras, ou com uma regra que não dá para entender, cai nele e segue
funcionando. Um fixo que some da previsão por causa de um texto torto é pior do
que um caindo no dia errado, que se vê e se conserta. "Preencher previsão até dezembro" escreve esses
valores nos dias que ainda não chegaram, sem mexer no passado e sem repetir o
que já está lançado. Um fixo marcado para o dia 31 cai no dia 30 em mês de 30
dias — que é justamente o que a planilha errava.

Lançamento previsto entra na conta igual a qualquer outro (é o que a planilha
fazia ao já trazer outubro, novembro e dezembro preenchidos), e aparece
marcado como "previsto". Quando acontece de verdade, um toque em **Aconteceu**
confirma o valor.

## Lançar sem abrir o app

`POST /api/lancar?valor=39&categoria=mercado`, com o código de acesso no
cabeçalho `x-codigo` —
sem tipo é gasto do dia a dia, sem data é hoje. A resposta traz o saldo do dia já
calculado, para a notificação do atalho dizer o que aconteceu sem abrir nada. O
mesmo vale em corpo JSON, `{"valor":"38,50"}`, para quem montou o atalho assim.

É a porta que o app Atalhos do iPhone usa, e o disparo principal é a voz:
*"E aí Siri, Lançar gasto"*, ela pergunta quanto, você fala, ela responde com o saldo.
O nome do atalho é a frase, e por isso ele tem duas palavras: nome de uma
palavra só, ainda mais sendo verbo comum, a Siri ouve como o começo de uma frase
e sai procurando na internet. O passo a passo mora **dentro do app**, em Ajustes → Atalho
do iPhone, com o endereço já preenchido e botão de copiar em cada palavra que
precisa ser digitada sem erro — um guia num arquivo do repositório é o mesmo que
nenhum guia para quem nunca vai abrir o GitHub. A mesma coisa em texto está em
[`docs/ATALHO-DO-IPHONE.md`](docs/ATALHO-DO-IPHONE.md).

O que essa porta **não** faz, e nenhum app de finanças faz no iPhone: ler os
seus pagamentos por Apple Pay, as notificações do banco ou o Pix que caiu. A
Apple não expõe isso a app nenhum. O atalho não adivinha o valor — ele encurta a
distância entre gastar e anotar.

Três decisões que essa porta carrega:

- **O código vai no cabeçalho, nunca no endereço.** Endereço fica gravado em
  registro de servidor e em histórico de navegador, e esse código é a chave do
  dinheiro de alguém. O valor, sim, pode ir no endereço: são segredos de
  tamanhos diferentes, e é essa diferença que deixa o atalho ter quatro ajustes
  em vez de sete — montar o corpo JSON dentro do app Atalhos é o passo em que
  todo mundo trava. `camposDoEndereco` lê valor, tipo, data e nota da busca, e
  **nunca** o código, nem quando alguém o escreve lá.
- **"Hoje" é o dia no fuso de quem usa, não no do servidor.** A Vercel roda em
  UTC; sem isso um gasto lançado às dez da noite em São Paulo nasceria no dia
  seguinte, e o saldo do dia sairia errado bem na hora em que mais se olha para
  ele.
- **A categoria vai pelo nome falado, e quem traduz é o servidor.** "mercado",
  "conta de luz", "saude" sem acento: a busca vai afrouxando — igual, começa
  com, primeira palavra, contém — porque ditado não bate letra por letra. Uma
  categoria que não casa **não derruba o lançamento**: o valor entra sem
  categoria e a notificação avisa, porque perder o gasto por causa de uma
  palavra ouvida errada desfaria o que o atalho veio resolver.
- **Um tipo que não existe é recusado, não adivinhado.** Silenciar o erro
  colocaria dinheiro na coluna errada sem ninguém ficar sabendo.
- **O valor ditado é lido como fala, e o ambíguo é recusado.** A leitura antiga
  apagava tudo o que não fosse dígito, e por voz isso mordia: *"38 reais e 50"*
  virava **R$ 3.850,00** — dez vezes o valor, calado, dentro do saldo. Hoje as
  formas faladas que só têm uma leitura são entendidas ("38 reais e 50 centavos"
  só pode ser R$ 38,50) e o resto é recusado com uma frase que ensina a falar.
  "38 e 50" fica de fora de propósito: pode ser um valor, podem ser dois.

A leitura do pedido é pura e vive em [`src/lib/atalho.ts`](src/lib/atalho.ts),
separada do banco, para caber em teste.

## Sincronizar entre o iPhone e o computador

O app tem o ano inteiro dentro do aparelho e faz as contas ali mesmo — por isso
abre instantâneo, e abre sem internet. De tempos em tempos ele manda ao servidor
o que mudou aqui e recebe o que mudou lá.

Duas regras governam tudo ([`src/app/api/sync/route.ts`](src/app/api/sync/route.ts)):

1. **Quem escreveu por último ganha.** Cada linha carrega o relógio de quem a
   escreveu; uma alteração mais velha nunca sobrescreve uma mais nova, mesmo
   chegando depois — que é o que acontece quando o celular passa o dia sem sinal
   e sobe tudo à noite.
2. **Apagar é marcar a data, nunca sumir com a linha.** Uma linha que some não
   tem como ser levada ao outro aparelho, e voltaria do túmulo na sincronização
   seguinte.

O "desde quando" é o relógio do **servidor**, não o do celular: um aparelho
adiantado que mandasse o próprio relógio esconderia de si mesmo tudo o que o
outro escreveu no meio.

Sem internet, o que você escreve fica numa fila **gravada no aparelho** — junto
com o dado, e não só na memória. Foi um erro que este código já teve: um
lançamento feito no metrô, com o app fechado antes de o sinal voltar, ficava
para sempre só naquele celular. Na abertura, o app ainda refaz a fila a partir
dos próprios dados (tudo que mudou depois da última sincronização), de modo que
nem uma gravação perdida deixa algo para trás.

## Detalhes de iPhone que o código resolve

- O valor do lançamento tem **teclado próprio**, porque o do iPhone não tem a
  tecla de mais. De quebra ele não come metade da tela, não dá zoom ao focar e
  não tem tecla de letra para errar.
- Os campos de dinheiro que restam **não** são `type="number"`: no teclado em
  português a tecla decimal é a vírgula, e um campo numérico descarta o que se
  digita com ela — "52,5" viraria vazio. São campos de texto com `inputMode`.
- `<meta name="apple-mobile-web-app-capable" content="yes">` é declarado à mão,
  e esta linha é a que faz o ícone da tela de início abrir sem a barra do
  Safari. O Next emitia essa etiqueta sozinho a partir de `appleWebApp.capable`;
  da versão 15 em diante ele emite só `mobile-web-app-capable`, o nome
  padronizado — que o iOS não conhece. A etiqueta sumiu sem ninguém mexer em
  nada, e o sintoma é traiçoeiro: o app instala, ganha ícone, abre em janela
  própria e ainda assim tem a barra do navegador em cima. O manifesto declara
  `display: "standalone"`, que em tese bastaria; no iPhone, não bastou.
  `src/app/layout.test.ts` segura a etiqueta no lugar, porque a falta dela não
  quebra build nenhum e só se sente num aparelho de verdade.
- O manifesto declara `scope: "/"`, para o iPhone não tratar como "fora do app"
  um endereço que não seja o de abertura.
- O app percebe quando está sendo aberto **no navegador** em vez de pelo ícone,
  e diz isso num cartão — com o detalhe que ninguém adivinha: o iPhone tira uma
  cópia do manifesto e das etiquetas na hora de instalar, então um ícone antigo
  carrega os ajustes antigos até ser apagado e refeito.
- Campos com 17 px, para o Safari não dar zoom ao focar. `touch-action:
  manipulation` nos botões, sem atraso de duplo toque.
- Áreas seguras respeitadas: entalhe, laterais e a faixa do gesto.
- O conteúdo é montado no aparelho, nunca no servidor. Além de os dados
  morarem aqui, "hoje" no servidor é o dia em UTC e no seu iPhone é o dia em
  Brasília: entre nove da noite e a meia-noite os dois discordam, e o React
  apagava a tela ao achar 15 onde tinha escrito 14.
- A versão nova entra na abertura seguinte; o app nunca recarrega a página
  sozinho, para não levar junto um lançamento em digitação.
- Botão **Lançar** numa barra opaca, e não um botão redondo flutuando: o
  redondo pousava justamente sobre a coluna do saldo.

## Cores

O fundo é cinza frio e os cartões são brancos de verdade, com sombra. O arranjo
anterior — papel bege e cartão quase da mesma cor, separados por um fiozinho —
deixava tudo com cara de documento velho, e nada parecia um cartão. Em cada tela
há um cartão preto, e um só: o número que a tela existe para mostrar.

A serifa titula, a sans conta — e **nenhum número de dinheiro é serifado**. Numa
coluna a gente compara valores pela forma dos dígitos, e a serifa tira a
regularidade que essa comparação usa.

A paleta passou pelo validador de daltonismo e de contraste contra as duas
superfícies do app, a clara e a escura. Verde e vermelho nunca carregam
sentido sozinhos: entrada vem com "+", saída com "−", e cada coluna tem título —
quem não distingue as duas cores continua lendo a tela.

O gráfico do ano é uma série só, então não tem legenda: o título diz o que a
linha é, o zero está marcado no eixo, e o trecho que cai abaixo dele muda de
cor. A tabela dos doze meses logo abaixo é o mesmo dado em números.

## Como o código está organizado

    src/lib/calculo.ts       o motor: o saldo, o rodapé do mês, a previsão
    src/lib/planilha.ts      .xlsx → lançamentos (roda no navegador)
    src/lib/dinheiro.ts      centavos, vírgula decimal, "195+15+83"
    src/lib/calculadora.ts   o que o teclado do app digita → conta e parcelas
    src/lib/datas.ts         dia de caderno: texto, sem fuso
    src/lib/atalho.ts        o que o atalho do iPhone manda → lançamentos
    src/lib/loja.ts          o estado no aparelho, a fila e a sincronização
    src/lib/auth.ts          a porta: um código, um cookie assinado
    src/app/api/sync         o único endereço que o app chama
    src/app/(app)/           uma tela por pasta: hoje, mês, ano, fixos, ajustes, atalho
    src/componentes/         as peças, o teclado, o calendário e as folhas

Todo dinheiro é inteiro em centavos (`valorCents`), e sempre múltiplo de 100.
Nunca `Float`: a planilha guardava 87,36866667 numa célula de média, e aqui a
conta fecha.

**O app não trabalha com centavos.** Não é só exibição: o valor é arredondado ao
entrar — em `loja.salvarLancamento`, `loja.salvarFixo` e na porta do atalho —
de modo que a soma das partes sempre bate com o total. Esconder os centavos e
continuar guardando-os daria um rodapé fechando um real fora do que a coluna
mostra, que é o tipo de diferença que custa meia hora de procura. A unidade
guardada continua sendo o centavo, e não o real, porque é ela que o banco tem e
mudá-la não deixaria nada mais simples.

Os lançamentos que vieram da planilha com centavos são arredondados de uma vez,
por **Ajustes → Centavos que sobraram** — uma seção que só existe enquanto
houver o que arrumar e some depois. O backup é baixado antes da alteração, não
oferecido depois: quem clicou num botão que diz "não tem volta" já decidiu.

## Rodar no computador

```sh
npm install
cp .env.example .env     # ajuste DATABASE_URL, AUTH_SECRET e CODIGO_DE_ACESSO
npx prisma migrate deploy
npm run dev              # http://localhost:3000
```

| comando | o que faz |
|---|---|
| `npm test` | o motor de cálculo e a leitura da planilha |
| `npm run typecheck` | TypeScript strict, sem emitir |
| `npm run build` | build de produção |
| `npm run vercel-build` | o que a Vercel roda: migra o banco **só em produção**, depois compila |

A migração usa a conexão sem intermediário quando existe uma (`DATABASE_URL_UNPOOLED`,
que o Neon entrega no mesmo snippet). A conexão do dia a dia passa por um
pgbouncer, que aguenta muitos acessos curtos mas recusa os comandos de sessão
que criar e alterar tabela exige — e o erro que aparece não diz isso. Num
Postgres comum, sem essa segunda variável, tudo corre pela conexão única.

Os ícones em `public/` são gerados por `python3 scripts/gerar-icones.py` (pede
`pillow`). Já estão versionados; só rode de novo se mudar o desenho.
