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
10, os 60 reais de todo dia. "Preencher previsão até dezembro" escreve esses
valores nos dias que ainda não chegaram, sem mexer no passado e sem repetir o
que já está lançado. Um fixo marcado para o dia 31 cai no dia 30 em mês de 30
dias — que é justamente o que a planilha errava.

Lançamento previsto entra na conta igual a qualquer outro (é o que a planilha
fazia ao já trazer outubro, novembro e dezembro preenchidos), e aparece
marcado como "previsto". Quando acontece de verdade, um toque em **Aconteceu**
confirma o valor.

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

- Os campos de dinheiro **não** são `type="number"`: no teclado em português a
  tecla decimal é a vírgula, e um campo numérico descarta o que se digita com
  ela — "52,5" viraria vazio. São campos de texto com `inputMode`, que abrem o
  mesmo teclado numérico e aceitam a vírgula. E aceitam a soma — `195+15+83` —
  que é como se fazia dentro da célula.
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

A paleta passou pelo validador de daltonismo e de contraste contra as duas
superfícies do app, a de papel e a escura. Verde e vermelho nunca carregam
sentido sozinhos: entrada vem com "+", saída com "−", e cada coluna tem título —
quem não distingue as duas cores continua lendo a tela.

O gráfico do ano é uma série só, então não tem legenda: o título diz o que a
linha é, o zero está marcado no eixo, e o trecho que cai abaixo dele muda de
cor. A tabela dos doze meses logo abaixo é o mesmo dado em números.

## Como o código está organizado

    src/lib/calculo.ts       o motor: o saldo, o rodapé do mês, a previsão
    src/lib/planilha.ts      .xlsx → lançamentos (roda no navegador)
    src/lib/dinheiro.ts      centavos, vírgula decimal, "195+15+83"
    src/lib/datas.ts         dia de caderno: texto, sem fuso
    src/lib/loja.ts          o estado no aparelho, a fila e a sincronização
    src/lib/auth.ts          a porta: um código, um cookie assinado
    src/app/api/sync         o único endereço que o app chama
    src/app/(app)/           uma tela por pasta: mês, ano, fixos, ajustes, importar
    src/componentes/         as peças e as folhas que sobem de baixo

Todo dinheiro é inteiro em centavos (`valorCents`). Nunca `Float`: a planilha
guardava 87,36866667 numa célula de média, e aqui a conta fecha.

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

Os ícones em `public/` são gerados por `python3 scripts/gerar-icones.py` (pede
`pillow`). Já estão versionados; só rode de novo se mudar o desenho.
