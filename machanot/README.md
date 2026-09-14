# Plataforma de precificação de machanot — Chazit Hanoar

Orçamento, rateio e grade de preços das machanot de kaitz e choref. Substitui a
planilha que era copiada a cada edição — e que já produziu erros de milhares de
reais.

O objetivo não é só automatizar a conta. É tornar visíveis decisões que ficavam
enterradas em fórmulas: quanto do preço de cada criança é subsídio à liderança,
quanto é fundo de bolsas, e qual é a margem real.

## Como rodar

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL, AUTH_SECRET e EMAILS_AUTORIZADOS
npx prisma migrate deploy     # em dev: npx prisma migrate dev
npm run db:seed               # carrega a Machané Kaitz 2026 real e confere os números
npm run dev
```

Entrada em `/login`. Há dois caminhos:

- **Código de acesso** — defina `CODIGO_DE_ACESSO` (mínimo 12 caracteres) e a
  pessoa entra com e-mail + código. O e-mail ainda precisa estar em
  `EMAILS_AUTORIZADOS`: o código sozinho não abre nada. É o caminho enquanto o
  envio de e-mail não estiver ligado. Com a variável vazia, esta porta não existe.
- **Link mágico** — sem senha, vale 15 minutos e serve uma vez. Precisa de um
  provedor de e-mail configurado em `src/lib/email.ts`; em desenvolvimento o
  link aparece na tela e no terminal.

Para gerar um link pela linha de comando (primeiro acesso, e-mail fora do ar):

```bash
npx tsx scripts/link-de-entrada.ts coordenacao@chazit.org.br http://localhost:3000
```

Outros comandos:

| comando | o que faz |
|---|---|
| `npm test` | testes do motor de cálculo (o que trava a planilha ao centavo) |
| `npm run typecheck` | TypeScript strict, sem emitir |
| `npm run build` | build de produção |
| `npm run db:studio` | Prisma Studio |

## Regra de ouro do dinheiro

Todo valor monetário é **inteiro em centavos** (`Int`), nunca `Float`. A
conversão para reais acontece só na apresentação (`src/lib/dinheiro.ts`).
Percentuais e pesos são frações: 0,03 = 3%.

## Onde as coisas estão

```
src/lib/calculo.ts       o motor: função pura, sem I/O. É a única fonte de preço.
src/lib/calculo.test.ts  a planilha de 2026 reproduzida ao centavo
src/lib/estado.ts        o estado da machané como ele viaja até o navegador
src/lib/divulgacao.ts    texto para o grupo de pais e CSV do orçamento
src/lib/pdf.ts           PDF da tabela de preços
src/app/actions.ts       toda escrita passa por aqui: Zod + registro de alteração
src/components/machane/  provedor de estado, painel ao vivo, navegação
src/components/telas/    as nove telas
prisma/schema.prisma     o modelo de dados
docs/DIVERGENCIAS.md     onde o modelo não reproduz a planilha, e por quê
docs/LGPD.md             o que não se coleta aqui
```

## Os sete blocos do cálculo

```
1. Parâmetro-raiz: a diária por pessoa, negociada com o local
2. Hospedagem   = Σ (quantidade × dias × diária), por categoria
3. Gastos fixos = Σ de quatro tipos diferentes de custo
4. Custo total  = hospedagem + fixos
5. Receita dos madrichim: contribuição simbólica; a diferença vira preço de chanich
6. Rateio por PESSOA-DIA entre grandes e pequenos
7. Grade: 4 categorias comerciais × 2 turmas, mais a segunda leva
```

### O peso do rateio não é uma opinião

```
peso_grandes = (N_grandes × dias_grandes)
             ÷ (N_grandes × dias_grandes + N_pequenos × dias_pequenos)
```

Em 2026 isso dá 89,63%. A planilha usava 89%, digitado à mão. A plataforma
calcula o peso; a coordenação pode sobrescrevê-lo por decisão política, mas o
override exige justificativa e mostra o deslocamento em reais antes de salvar —
naquele caso, R$ 1.664,33 saindo dos grandes e caindo nos babys, R$ 97,90 a mais
por criança pequena.

### Os quatro tipos de gasto fixo

| tipo | fórmula |
|---|---|
| `VALOR_FECHADO` | `valorCents` |
| `POR_PESSOA` | `valorCents × total de pessoas` |
| `POR_DIARIA` | `diária da machané × pessoas × dias` |
| `CACHE_DIARIO` | `valorCents × pessoas × dias` (cachê próprio, não a diária) |

`POR_DIARIA` existe porque há gente que ocupa vaga sem ser participante
(enfermeira, psicóloga, mechanech, shagririm). `CACHE_DIARIO` é o pagamento pelo
serviço dessas pessoas, que é outra coisa.

### Dupla contagem

Se uma categoria de pessoas já gera hospedagem **e** existe uma linha de gasto
`POR_DIARIA` falando da mesma gente, a diária entra duas vezes. A flag
`Categoria.geraHospedagem` separa os dois modelos e `avisosDuplaContagem()`
acusa o risco em amarelo no painel. O cadastro histórico de 2026 usa
`geraHospedagem: false` para equipe e segurança — é o que reproduz a planilha.

## As telas

| # | tela | para quê |
|---|---|---|
| 1 | Parâmetros | diária negociada, valor de tabela, dias, datas |
| 2 | Pessoas | quantidades por categoria; total de pessoas e pessoa-dia |
| 3 | Custos | gastos por categoria, observação obrigatória, composição |
| 4 | Madrichim | cadastro nominal, bolsas, pagamentos, arrecadação |
| 5 | Rateio | peso calculado × aplicado, com o deslocamento em reais |
| 6 | Preços | a grade 4×2, segunda leva, texto de divulgação, PDF e CSV |
| 7 | Transparência | por que este preço: subsídio, bolsas, rateio, margem |
| 8 | Cenários | e se… três colunas lado a lado |
| 9 | Comparativo | esta machané contra a anterior, em R$ e em % |
| 10 | Registro | quem mudou o quê, quando, e o valor de antes |

Nenhuma tela tem botão "calcular": o painel lateral recalcula a cada tecla e o
salvamento acontece sozinho, meio segundo depois da última alteração. Dá para
pular de tela em tela fora de ordem — não existe wizard.

## Duplicar a machané anterior

Copia estrutura (categorias, gastos, política), **zera todas as quantidades** e
marca todo gasto herdado como não revisado. Publicar fica bloqueado enquanto
houver item sem revisão ou gasto sem observação. Esse bloqueio existe porque os
três erros mais caros da planilha vieram de copiar uma aba e esquecer de revisar.

## Proteção de dados

Sem CPF e sem RG. Sem cadastro nominal de chanichim — o sistema trabalha com
quantidades, não com crianças identificadas. Tudo atrás de autenticação, nenhuma
rota pública com dados. Ver `docs/LGPD.md`.
