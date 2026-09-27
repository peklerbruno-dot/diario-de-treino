# Assistente

Um assistente pessoal que mora no seu WhatsApp. Você escreve para um número, e
quem responde é o Gemini, do Google — com memória, lembretes, listas e pesquisa
na internet. **Custo zero**: todas as peças usam planos gratuitos.

Quem quer só colocar no ar, sem mexer em código: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).

## O que ele faz

- **Conversa.** Pergunte qualquer coisa, peça um texto, uma conta, uma ideia
  de jantar. Ele lembra das últimas 30 falas.
- **Guarda o que importa.** "Lembra que a Ana é alérgica a camarão." Isso vira
  uma memória que vai junto em toda conversa, para sempre (até você pedir para
  esquecer).
- **Lembra você.** "Me lembra amanhã às 9h de ligar pro dentista", "todo dia
  útil às 8h, remédio". Na hora, ele mesmo manda a mensagem.
- **Listas.** "Põe leite e pão na lista de compras", "o que tem na lista?",
  "tira o leite".
- **Pesquisa.** Clima, notícias, horário de farmácia, preço — quando a
  resposta depende de hoje, ele procura na internet.
- **Lê fotos e PDFs.** Mande a foto de um cardápio, de uma conta, de um
  documento, e pergunte.
- `/nova` zera a conversa (as memórias, os lembretes e as listas ficam).

Áudio ainda não: ele avisa e pede por escrito.

## Como funciona

    WhatsApp ──► Meta (Cloud API) ──► /api/whatsapp ──► Gemini ──► ferramentas (banco)
                                           │                           │
                                           ◄──────── resposta ─────────┘

    cron-job.org, a cada minuto ──► /api/lembretes ──► Meta ──► WhatsApp

- **A API oficial do WhatsApp**, da Meta. Nada de biblioteca que finge ser o
  WhatsApp Web: essas funcionam até o dia em que o número é banido.
- **Só você fala com ele.** Mensagem de qualquer outro número é ignorada em
  silêncio. Cada aviso da Meta tem a assinatura conferida com a chave secreta
  do app, então ninguém consegue se passar por ela.
- **Responde depois de confirmar.** A Meta reenvia o aviso se não receber
  resposta rápido; por isso o app responde "recebido" na hora e só depois
  chama o Gemini (`after()` do Next). E guarda o id de cada mensagem, para um
  reenvio não virar resposta dobrada.
- **Lembretes que não tocam duas vezes.** Cada lembrete é "reservado" no banco
  antes de sair; se duas chamadas do relógio se cruzarem, só uma manda.

## Por que é de graça, e o que isso custa

| Peça | Plano gratuito |
|---|---|
| Gemini (o cérebro) | cota diária gratuita do Google AI Studio, sem cartão |
| WhatsApp Cloud API | mensagens em resposta a você não são cobradas |
| Vercel | plano Hobby |
| Banco (Postgres da Vercel/Neon) | plano gratuito |
| cron-job.org | gratuito |

Três coisas vêm junto com o "grátis":

1. **O Google pode ler.** No plano gratuito, o que passa pelo Gemini pode ser
   usado para melhorar os produtos do Google e revisado por pessoas (os termos
   dizem que desligam os dados da sua conta antes). Por isso o assistente foi
   instruído a recusar guardar senha, cartão, CPF e documentos. Não mande
   para ele o que você não mandaria para um desconhecido.
2. **Há um limite por dia e por minuto.** Para uma pessoa, sobra. Se estourar,
   ele avisa ("acabou a minha cota") e volta sozinho — a cota diária renova
   de madrugada, no horário de Brasília. Os lembretes não gastam cota: quem
   manda é o próprio app.
3. **Ele é menos esperto que um modelo pago.** O "flash-lite" é o modelo
   com a cota mais folgada. Se um dia quiser mais capricho, `GEMINI_MODELO`
   troca o modelo (os maiores têm cota gratuita bem menor).

O único ponto que pode cobrar: o modelo de mensagem do lembrete depois de 24
horas sem conversa (abaixo). Sem ele, custo zero.

## A janela de 24 horas

Regra da Meta: o assistente só pode mandar mensagem livre até 24 horas depois
da **sua** última mensagem. Um lembrete que cair depois disso é recusado —
a não ser que exista um *modelo de mensagem* aprovado, que é o texto padrão que
a Meta deixa enviar a qualquer hora.

Duas saídas, e dá para usar as duas:

1. Cadastrar o modelo (passo 7 do guia). Com ele, o lembrete tenta a mensagem
   normal e, se a Meta recusar pela janela, manda pelo modelo.
2. Falar com ele pelo menos uma vez por dia — o que, para um assistente, tende
   a acontecer sozinho.

## Onde fica cada coisa

    src/app/api/whatsapp/route.ts   recebe as mensagens da Meta e responde
    src/app/api/lembretes/route.ts  o relógio: manda os lembretes vencidos
    src/app/page.tsx                página que diz o que falta configurar
    src/lib/cerebro.ts              o laço com o Gemini, a pesquisa e o prompt
    src/lib/ferramentas.ts          memórias, lembretes e listas
    src/lib/whatsapp.ts             chamadas à API da Meta
    src/lib/formato.ts              assinatura, leitura do aviso, formatação
    src/lib/datas.ts                fuso e repetição dos lembretes
    prisma/schema.prisma            o banco: conversa, memórias, lembretes, listas

## O jeito dele

O prompt está em `src/lib/cerebro.ts` (`INSTRUCOES`). É texto comum: dá para
mudar o tom, o que ele deve ou não fazer, e publicar de novo.

Duas variáveis opcionais mudam o motor:

- `GEMINI_MODELO` — o da conversa. Padrão `gemini-flash-lite-latest`, o de
  cota gratuita mais folgada, sempre na versão estável mais nova.
- `GEMINI_MODELO_PESQUISA` — o da pesquisa no Google. Padrão
  `gemini-2.5-flash-lite`: no plano gratuito, a pesquisa só vem incluída em
  alguns modelos, e este é um deles. Ela roda numa chamada à parte, e a
  resposta volta para a conversa como o resultado de uma ferramenta.

Os limites e o que cada modelo inclui mudam sem muito aviso; os seus, de
verdade, aparecem em https://aistudio.google.com/rate-limit.

## Rodar no computador

```sh
cp .env.example .env.local   # e preencha
npm install
npx prisma migrate deploy
npm run dev
npm test                      # datas, fuso, assinatura, formatação
```

Para a Meta alcançar o computador é preciso um túnel (`ngrok http 3000`, por
exemplo) e apontar o webhook para ele.
