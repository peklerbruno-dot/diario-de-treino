# Dieta

O plano da nutricionista no celular, **um aviso na hora de cada refeição** e o
controle da água do dia.

Quem quer só colocar no ar, sem mexer em código: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).

## O que ele faz

**O plano entra pelo PDF.** Em Plano → *Plano novo*, mande o PDF que a
nutricionista passou (ou fotos das páginas, ou o texto que veio pelo WhatsApp).
O Gemini lê as refeições, os horários, as quantidades, as **substituições** de
cada item e as **opções** da refeição inteira ("Opção 1 / Opção 2"). Nada entra
direto: a tela mostra tudo para conferir e corrigir antes de salvar. Se o plano
pede uma meta de água, ela vira a sua.

A cada consulta, um plano novo; o anterior fica guardado em Plano e dá para
voltar a ele.

**Hoje** mostra as refeições do dia na ordem. A próxima vem aberta e em
destaque, com o que o plano sugere (as opções em abas, as substituições de cada
item a um toque). As outras ficam numa linha, que abre ao tocar. Cada uma tem
**Segui**, **Troquei** e **Pulei**, e qualquer um deles abre a **ficha da
refeição**, um lugar só para tudo:

1. como foi (dá para mudar ali mesmo);
2. o que comeu — em "Segui", a opção do plano já vem escrita; as suas
   **refeições padrão** (⭐) e o que comeu nela nos últimos dias (↺) ficam a um
   toque; em "Pulei", o motivo;
3. foto, opcional (câmera ou galeria; com foto, o Gemini estima as calorias, e
   o que você escreveu ajuda a leitura);
4. fome antes (🤤 🙂 😶) e como ficou depois (😌 🙂 😣);
5. observação.

Registrada, a refeição vira um resumo (o que comeu, os emojis, a foto), e um
toque reabre a ficha. **＋ Outra coisa** é para o que se come fora das
refeições do plano.

**Refeições padrão**: em Plano, cada refeição tem "Minhas refeições padrão" —
"Omelete com peito de peru", "Marmita de frango" — para escolher com um toque
na ficha. Também dá para criar na própria ficha, marcando "salvar como
refeição padrão".

**Avisos no iPhone.** Na hora de cada refeição chega uma notificação com o que
comer — "Almoço · 12h30 — Arroz integral 4 col. · Feijão 1 concha · Frango
120 g". Tocar nela abre o app direto naquela refeição. Dá para avisar alguns
minutos antes, e desligar o aviso de uma refeição só. Refeição já marcada não
avisa.

**Água.** Meta do dia, um toque por copo (o tamanho do copo é ajustável) e
lembretes de tempos em tempos numa janela do dia (8h às 21h, por padrão). A
barra mostra um tracinho com o ritmo — onde você deveria estar a essa hora para
fechar a meta. Os lembretes param quando a meta é batida e pulam o horário que
cairia colado numa refeição.

**Foto do prato.** Em Hoje → *Foto do prato*: escolha a refeição, tire a foto,
e o Gemini diz o que há no prato, estima calorias e macros (com "≈", porque é
olho e não balança) e compara com o que o plano pedia — "dentro do plano",
"parcialmente" ou "fora". Um toque marca a refeição como segui ou troquei. As
fotos ficam nos cartões das refeições e no Histórico; a imagem é guardada
reduzida no próprio banco.

**Corrigir a análise.** O Gemini errou ("era peito de peru, não presunto",
"foram 2 hambúrgueres")? Toque na foto → *Corrigir*, escreva o que está errado,
e ele refaz a conta com a correção como verdade. Ou *Editar à mão*: os itens,
as calorias, os macros e se seguiu o plano — o caminho quando a cota acabou.

**Sem foto.** Não deu tempo de fotografar? *O que comi* → *Sem foto: escrever o
que comi* ("2 hambúrgueres de frango com queijo, coca zero"), e o Gemini estima
a partir do texto. A anotação aparece no cartão da refeição e no dia, e entra
nas calorias do dia.

**Lembretes seus**, em Ajustes: remédio, creatina, vitamina, pesar-se — nome,
horário, dias da semana e o texto da notificação.

**Resumo da noite**: às 21h30 (ajustável), uma notificação com quantas
refeições seguiram o plano e quanto de água você bebeu. Em Hoje, a **sequência**
de dias no plano (dia com 80% das refeições marcadas como "segui").

**"Posso trocar?"**, em Hoje: "posso trocar o PF por um hambúrguer?" — o
Gemini responde com base no plano e nas orientações da nutricionista: pode,
pode com ajuste (e qual), ou melhor não (e a troca mais próxima).

**Semana**: a partir do plano (e de preferências como "não gosto de peixe",
"tenho airfryer"), o app monta o cardápio dos 7 dias com marmitas para cozinhar
de uma vez, o passo a passo do preparo e a lista de compras por seção do
mercado, para ir marcando no mercado.

**Progresso**: peso e medidas (cintura, quadril, braço) com gráfico, o histórico
dia a dia e, **para a nutricionista**, o resumo da semana em texto (WhatsApp)
ou em **PDF com as fotos dos pratos**.

**Cobrança gentil**: se uma refeição passa 1 hora (ajustável) da hora sem ser
marcada, chega "Como foi o almoço?". No **domingo**, o resumo da semana com o
ponto que mais pede atenção ("você pulou o lanche 3×").

**Treino**: nos dias de treino (Ajustes), aviso de pré-treino 1 h antes e de
pós-treino quando acaba, e um atalho para o Diário de treino na tela Hoje. Os
dois apps não trocam dados — o diário guarda tudo só no aparelho.

**Progresso**, em quatro abas:

- **Geral** — peso e medidas, **fotos do corpo** (uma por mês, com antes e
  depois lado a lado; ficam escondidas até tocar em "Mostrar"), as semanas e a
  lista de dias.
- **Calendário** — o mês com cada dia pintado (verde = 80%+ no plano, amarelo =
  metade ou mais, vermelho = menos), um pontinho onde há foto e onde a água
  bateu a meta. Embaixo, os números do mês contra o anterior, o peso no mês e os
  **padrões**: refeição que acontece bem depois do horário (pela hora da foto ou
  da marcação), a mais pulada, o dia da semana mais difícil, a refeição em que
  bate fome demais, o fim de semana mais calórico. Tocar num dia abre a
  **página do dia**: cada refeição com o que foi marcado, como você estava e as
  fotos dela; água, calorias e macros somados; o peso, se pesou.
- **Fotos** — todas as fotos dos pratos por dia, com filtro por refeição
  ("todos os almoços").
- **Relatório** — a semana com os números, o dia a dia, os padrões das últimas
  quatro semanas e o texto exatamente como vai para a nutricionista (em texto
  ou PDF). As setas voltam de semana em semana.

**Como você estava?** Depois de marcar uma refeição, um toque opcional: 😌
tranquilo, 😐 normal ou 😣 fome demais/ansiedade. Entra nos padrões e no
resumo da nutricionista.

**Backup**, em Ajustes: tudo num ZIP (os dados em JSON e todas as fotos), ou só
os dados. O ZIP é montado no próprio aparelho, foto a foto.

## Como funciona

    cron-job.org, a cada minuto ──► /api/avisos ──► Web Push ──► Apple ──► iPhone
                                         │
                                  src/lib/agenda.ts decide o que vence

- **As notificações são Web Push**, o padrão que o iPhone aceita desde o
  iOS 16.4 para apps adicionados à Tela de Início. Chegam com o app fechado.
  O par de chaves (VAPID) é só deste app; a tela Ajustes gera um para você
  colar na Vercel.
- **O relógio é de fora.** O cron da Vercel, no plano gratuito, roda uma vez por
  dia — inútil para aviso de almoço. O cron-job.org chama `/api/avisos` a cada
  minuto, de graça, com a senha `CRON_SECRET`.
- **Nenhum aviso sai duas vezes.** Antes de mandar, a chave do aviso
  (`2026-10-02|refeicao:…`) é gravada numa tabela com chave única; duas chamadas
  que se cruzem, só uma consegue. E um minuto pulado pelo cron não perde o aviso:
  ele vale por 20 minutos depois do horário.
- **Tudo no horário de São Paulo**, convertido pelo `Intl` (o servidor roda em
  UTC). Dia é texto (`2026-10-02`), hora é texto (`12:30`).
- **Uma porta só**, como no Termômetro: um código de acesso, que o aparelho
  lembra por seis meses.

## Como o código está organizado

    src/lib/agenda.ts        que avisos vencem agora: refeições, água, lembretes, resumo (puro, testado)
    src/lib/analise.ts       a leitura da foto do prato; sequencia.ts, relatorio.ts
    src/lib/semana.ts        o formato do planejamento da semana e do "posso trocar?"
    src/lib/conteudo.ts      opções, itens e substituições ↔ texto editável
    src/lib/leitor.ts        o Gemini lendo o PDF; plano-lido.ts confere a resposta
    src/lib/push.ts          envio das notificações
    src/lib/datas.ts         o relógio de São Paulo
    src/app/api/avisos       o que o cron chama
    src/app/(app)/           as telas: Hoje, Plano (e Plano novo), Histórico, Ajustes
    public/sw.js             recebe o push e abre o app na refeição

### O formato de uma refeição

Para editar no celular sem formulário de mil campos, o que comer é um texto,
uma coisa por linha:

    Opção 1:
    Pão integral — 2 fatias
    ou tapioca — 3 col. de sopa de goma
    Ovo mexido — 2 unidades
    Opção 2:
    Iogurte natural — 170 g

Linha terminada em ":" abre uma opção; linha que começa com "ou" é substituição
do item de cima.

## Rodar no computador

```sh
cp .env.example .env    # e preencha
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:3000
npm test                # as regras dos avisos, do formato e da leitura
npm run typecheck
```

## "O app abre com as barras do Safari"

É o iPhone abrindo o ícone como site, e não como app. Desde o iOS 26, a folha
"Adicionar à Tela de Início" tem a chave **Abrir como App Web**: desligada, o
ícone abre o Safari comum (e, fora do modo app, não há notificação). Apague o
ícone e adicione de novo com a chave ligada. O app mostra esse passo a passo
sozinho quando percebe que está no Safari.
