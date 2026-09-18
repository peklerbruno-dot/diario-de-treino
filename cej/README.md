# Centro de Estudos Judaicos — USP

O sistema da equipe: as atividades que o Centro promove, as reuniões que as
decidem, e os encaminhamentos que sobram delas — com nome e prazo.

Quem quer só colocar no ar, sem mexer em código:
[`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).

## O que ele resolve

Um centro de estudos dentro de uma universidade vive de coisas que acontecem em
datas — palestras, cursos, oficinas, congressos — e de combinados feitos em
reunião. As duas coisas costumam morar em lugares que não conversam: a data numa
planilha, o combinado num grupo de WhatsApp, e a memória de por que se decidiu
algo na cabeça de quem estava lá.

Este sistema junta as três, e acrescenta uma quarta que só aparece em dezembro:
o **relatório do ano** sai do que a equipe já cadastrou ao longo dele, em vez de
ser remontado de memória na semana do prazo.

## As seis telas

**Painel** abre respondendo "o que eu preciso ver hoje": o que está na sua mão e
já venceu, o que vem pela frente, e — o empurrão que o sistema dá sozinho —
quais atividades já passaram há mais de uma semana e continuam em aberto, que
são justamente as que somem do relatório.

**Calendário** põe atividades e reuniões no mesmo mês, com a cor da situação de
cada uma. É a tela que responde "outubro está cheio demais?", pergunta que
nenhuma lista responde. No rodapé dela está o endereço para assinar tudo isso
dentro do Google Agenda.

**Atividades** é o cadastro, e o campo que mais importa nele não descreve a
atividade: é a **situação** — ideia → aprovada → em preparação → divulgação →
realizada. Ela não fala da palestra, fala da equipe. Uma palestra em "ideia" há
quatro meses é uma pergunta; em "divulgação" para semana que vem é outra.

**Reuniões** tem pauta (escrita antes), ata (escrita depois) e presença. Pauta e
ata gravam cada uma por si, com um botão só delas: a ata se escreve com pressa,
durante ou logo depois da reunião, e não pode depender de o resto do formulário
estar preenchido.

**Encaminhamentos** é a lista única do que ficou combinado, agrupada por
urgência — atrasados, hoje, próximos sete dias, mais adiante — e nunca por data
de cadastro, que não interessa a ninguém. Abre pelos seus; a visão da equipe
inteira fica a um clique.

**Relatório** conta o período em números e em lista, exporta planilha e imprime
(ou salva em PDF pelo próprio diálogo de impressão). Só entra o que está marcado
como **realizada** — e, em vez de omitir o que ficou de fora, a tela avisa
quais atividades são, com link para marcar.

**Equipe** é onde a coordenação cadastra gente e gera os links de primeiro
acesso. Cada pessoa entra com o próprio e-mail, que é o que faz um
encaminhamento ter dono e uma ata ter autora.

## Duas decisões que atravessam o código inteiro

**Data é texto; hora é texto.** Um `DateTime` carrega fuso, e é assim que uma
palestra das 19h do dia 3, em São Paulo, chega ao servidor como 22h — e, se
fosse às 21h30, como *dia 4*. A data de uma palestra não é um instante no tempo
físico: é o que está escrito no cartaz. Então guarda-se o que está no cartaz,
`"2026-10-07"` e `"19:00"`, e ninguém converte nada. O fuso aparece num lugar
só, em [`src/lib/agenda.ts`](src/lib/agenda.ts), porque ali o Google precisa
dele.

**Nada some.** Apagar é marcar a data em `apagadaEm`, nunca tirar a linha do
banco. Numa equipe, "onde foi parar aquilo?" é uma pergunta que se faz, e uma
linha que sumiu não responde.

## O calendário, e o que ele ainda não é

O sistema publica um arquivo `.ics` num endereço secreto, um por pessoa, que o
Google Agenda assina e rebusca sozinho. Zero configuração: não há projeto no
Google Cloud, credencial, nem autorização de aplicativo.

É de **mão única** — o que se escreve aqui vai para o Google; o que se escreve
no Google não volta. A mão dupla exige a API do Google Calendar, com
credenciais; o banco já tem a coluna `googleEventoId` esperando por ela, em
atividades e reuniões, para que ligá-la depois não exija mexer no banco de
ninguém.

Formato de calendário é um daqueles lugares em que um erro de vírgula não dá
erro nenhum: simplesmente nada aparece na agenda, e ninguém descobre por quê.
Por isso o `.ics` é gerado por função pura e
[`src/lib/agenda.test.ts`](src/lib/agenda.test.ts) prende cada regra — o CRLF,
a dobra de linha em 75 **octetos** sem partir um acento ao meio, o fim
exclusivo do evento de dia inteiro, o fuso declarado dentro do arquivo.

## Como o código está organizado

    src/lib/          o miolo, sem tela e quase sem banco:
                      datas.ts (dia de caderno), agenda.ts (o .ics),
                      encaminhamentos.ts (urgência), relatorio.ts (as contas),
                      auth.ts + senha.ts (sessão e scrypt), consultas.ts (o banco)
    src/app/(app)/    uma pasta por tela, cada uma com a sua page.tsx
                      e, quando escreve, o seu acoes.ts
    src/app/api/      o calendário .ics, a planilha do relatório, a saúde
    src/componentes/  as peças de interface, quase todas de servidor

Quase nada é componente de cliente. O sistema é feito de formulários que o
servidor processa, então a página chega pronta e funciona antes de qualquer
JavaScript carregar — o que numa sala da FFLCH, com o wi-fi que tem, não é
detalhe. Os poucos que são de cliente estão lá por um motivo declarado no topo
do arquivo.

`npm test` roda as verificações do miolo: datas, o `.ics`, a urgência dos
encaminhamentos e as contas do relatório.

## Rodar no computador

```sh
npm install
cp .env.exemplo .env     # e preencha
npm run db:migrate       # cria as tabelas
npm run dev              # http://localhost:3000
npm test
npm run typecheck
```

Precisa de um Postgres. Em desenvolvimento serve qualquer um; em produção é o da
Vercel, criado no passo 1 do guia.

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | o banco |
| `DATABASE_URL_UNPOOLED` | só na hora de criar tabelas (a Vercel entrega junto) |
| `AUTH_SECRET` | assina a sessão; trocá-la derruba todas as sessões |
| `CODIGO_DE_FUNDACAO` | libera a criação da primeira conta, e só ela |
