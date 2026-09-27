# Assistente

Um assistente pessoal que mora no seu WhatsApp. Você escreve para um número, e
quem responde é o Claude — com memória, lembretes, listas e pesquisa na
internet.

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

    WhatsApp ──► Meta (Cloud API) ──► /api/whatsapp ──► Claude ──► ferramentas (banco)
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
  chama o Claude (`after()` do Next). E guarda o id de cada mensagem, para um
  reenvio não virar resposta dobrada.
- **Lembretes que não tocam duas vezes.** Cada lembrete é "reservado" no banco
  antes de sair; se duas chamadas do relógio se cruzarem, só uma manda.

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
    src/lib/claude.ts               o laço com o Claude e o prompt
    src/lib/ferramentas.ts          memórias, lembretes e listas
    src/lib/whatsapp.ts             chamadas à API da Meta
    src/lib/formato.ts              assinatura, leitura do aviso, formatação
    src/lib/datas.ts                fuso e repetição dos lembretes
    prisma/schema.prisma            o banco: conversa, memórias, lembretes, listas

## O jeito dele

O prompt está em `src/lib/claude.ts` (`INSTRUCOES`). É texto comum: dá para
mudar o tom, o que ele deve ou não fazer, e publicar de novo.

Duas variáveis opcionais mudam o motor:

- `ANTHROPIC_MODELO` — padrão `claude-opus-5`.
- `ANTHROPIC_ESFORCO` — quanto ele pensa antes de responder: `low`, `medium`
  (padrão) ou `high`. Mais esforço, respostas mais cuidadosas e mais lentas.

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
