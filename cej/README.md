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

## As telas

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

**Contatos** é a outra metade do sistema: para quem o Centro faz o que faz. O
número que a tela põe em primeiro lugar não é quantos contatos existem, e sim
**quantos podem receber boletim** — esse é sempre menor, e é ele que decide o
alcance de verdade. Importa a planilha que a equipe já tem sem precisar arrumá-la
antes: o sistema lê, mostra o que entendeu de cada coluna, aponta linha a linha o
que não vai aproveitar, e só grava depois que você confere.

**Boletins** escreve o e-mail à mão e deixa o sistema montar a lista de
atividades — assim não há como o boletim anunciar um horário que mudou. Segmenta
por vínculo e por etiqueta, mostra para quantas pessoas vai antes de ir, manda um
teste para você, e dispara em lotes que sabem continuar de onde pararam.

**Equipe** é onde a coordenação cadastra gente e gera os links de primeiro
acesso. Cada pessoa entra com o próprio e-mail, que é o que faz um
encaminhamento ter dono e uma ata ter autora.

## As três telas que gente de fora vê

Sem conta, sem senha, sem sessão — e é por isso que cada uma se protege por uma
**chave secreta no próprio endereço**, e não por um número de banco vindo do
formulário. Se fosse por um número, bastaria trocá-lo na barra de endereços para
se inscrever em nome de outra pessoa ou descadastrar quem se quisesse.

**`/agenda`** é a agenda aberta, para mandar em lista, pôr no Instagram ou
embutir no site da FFLCH. O filtro é a própria situação da atividade: aparece o
que a equipe marcou como *divulgação*, que já quer dizer "está de pé e pode ser
anunciada". Não há uma segunda chavinha de "publicar" — duas chaves para a mesma
decisão viram duas verdades.

**`/inscricao/<chave>`** é o formulário de inscrição de uma atividade, que
substitui o Google Forms e faz a base crescer sozinha: quem se inscreve entra nos
contatos com o consentimento registrado pelo próprio punho, que é como ele vale
mais.

**`/descadastrar/<chave>`** tira a pessoa da lista em um clique, sem login e sem
pergunta. É a tela mais importante do sistema para a entrega dos e-mails: quem
não acha como sair marca a mensagem como spam, e a marcação de spam estraga a
entrega de tudo o que o Centro mandar depois, para todo mundo.

E **`/certificado/<chave>`**, que é o certificado de participação de quem teve a
presença marcada — uma página feita para ser impressa ou salva em PDF pelo
próprio diálogo de impressão. O endereço é secreto e permanente, o que lhe dá uma
segunda função: quem receber o PDF pode abrir o link e ver que ele saiu daqui.

## O boletim, e o que ele exige de fora

Mandar e-mail é a única coisa no sistema que depende de um serviço de terceiro e
de um domínio — e por isso é a única que pode não estar ligada. O resto funciona
sem ela: a base, a segmentação, as inscrições, o descadastro, e a exportação da
lista segmentada em planilha, que é o que faz o CRM valer desde o primeiro dia.

Quando está ligado, o envio anda em lotes de cem, marcando cada linha no banco à
medida que sai. É o que permite fechar a página no meio e continuar depois, sem
ninguém receber duas vezes. Uma recusa do serviço para o envio, guarda o motivo
por escrito em cada linha que não saiu, e o botão de tentar de novo retoma só
essas.

Três regras estão no código e não na tela, porque é onde elas não podem ser
esquecidas: só recebe quem tem **consentimento registrado**; todo e-mail sai com
link de descadastro e com o cabeçalho `List-Unsubscribe`; e **quem sai, fica
fora para sempre** — importar a planilha antiga não traz ninguém de volta.

O passo a passo para ligar está em [`docs/BOLETIM.md`](docs/BOLETIM.md).

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
                      contatos.ts (o que é um contato), planilha.ts (a importação),
                      boletim.ts (o e-mail montado), email.ts (o envio),
                      auth.ts + senha.ts (sessão e scrypt), consultas*.ts (o banco)
    src/app/(app)/    uma pasta por tela de dentro, cada uma com a sua page.tsx
                      e, quando escreve, o seu acoes.ts
    src/app/          agenda, inscricao, descadastrar e certificado são as telas
                      de fora, com acoes-publicas.ts
    src/app/api/      o calendário .ics, as planilhas, a saúde
    src/componentes/  as peças de interface, quase todas de servidor

Quase nada é componente de cliente. O sistema é feito de formulários que o
servidor processa, então a página chega pronta e funciona antes de qualquer
JavaScript carregar — o que numa sala da FFLCH, com o wi-fi que tem, não é
detalhe. Os poucos que são de cliente estão lá por um motivo declarado no topo
do arquivo.

`npm test` roda as verificações do miolo: datas, o `.ics`, a urgência dos
encaminhamentos, as contas do relatório, a leitura de planilha, o e-mail montado
e o envio — este último com a rede trocada por um espião, então roda sem chave,
sem internet e sem custo.

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
| `RESEND_API_KEY` | o envio de boletins; sem ela, só o disparo fica de fora |
| `EMAIL_REMETENTE` | de qual endereço os boletins saem |
| `EMAIL_RESPONDER_PARA` | para onde vão as respostas (opcional) |
| `EMAIL_API_BASE` | brecha para testar o envio contra um servidor de mentira; **ignorada em produção** |
