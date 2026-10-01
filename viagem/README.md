# Viagem em grupo

O app da viagem do México (e das próximas): **os lugares que o grupo quer
conhecer, o roteiro dia a dia e a divisão de contas**, cada um com a sua conta,
todo mundo vendo a mesma coisa.

**No ar em https://viagem-mexico.vercel.app** (projeto `viagem-mexico` na conta Vercel brunopekler-4900, banco Neon gratuito ligado pela Vercel). Para publicar uma versão nova: `cd viagem && vercel deploy --prod`.

Quem só quer colocar no ar, sem mexer em código: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md)
(pela tela da Vercel) ou [`docs/LANCAR.md`](docs/LANCAR.md) (um comando, com três chaves).

## O que ele faz

**Lugares**
- **Manda um post e ele vira lista.** Cole o link de um reel ou carrossel do
  Instagram (ou TikTok, ou blog), mande os prints dos slides, cole um texto com
  dicas ou digite só “Contramar, CDMX”. O Gemini lê e sugere um lugar por
  restaurante, bar, praia ou passeio citado. Um carrossel com dez restaurantes
  vira dez sugestões.
- **Nada entra sozinho.** Tudo cai na **caixa de entrada**: você desmarca o que
  não interessa, corrige nome e cidade, escolhe a **pasta** (“Puerto Escondido”,
  “Tacos na CDMX”) e salva. Lugar repetido já vem desmarcado.
- **Link do Google Maps** entra direto, sem leitura, no ponto exato.
- **Mapa** com todos os lugares, filtro por pasta e tipo, **“perto de mim”**
  pelo GPS do celular, **♥ quero ir** para o grupo votar e **“já fomos”**.
- **Como chegar**: abre o Google Maps já navegando até o lugar (carro, a pé ou
  transporte), ou o Waze, ou o Uber com o destino preenchido.

**Roteiro**
- Os dias da viagem, com horário ou sem; cada item pode apontar para um lugar da
  lista. **Rota do dia**: um toque abre o Google Maps com todas as paradas do
  dia em ordem.

**Contas** — o que o Splitwise faz:
- Despesa em qualquer moeda (real, peso, dólar, euro), com o câmbio congelado
  no dia; os saldos aparecem na moeda da viagem.
- Quatro jeitos de dividir: **igual** entre quem estiver marcado, **valores
  exatos**, **porcentagem** e **cotas** (“o casal conta 2”). A divisão aparece ao
  vivo enquanto se digita.
- **Mais de um pagador** na mesma despesa.
- **Saldos**, **quem paga quem simplificado** (o menor número de Pix que zera
  todo mundo) ou **por pessoa**, e **acertar** para registrar o Pix.
- Para onde foi o dinheiro, por categoria.

**Grupo**
- **Convite** por link (manda no WhatsApp). Dá para pôr nas contas quem ainda
  não tem conta; quando a pessoa abre o convite, escolhe “sou o Pedro” e herda
  tudo que já estava no nome dela.

## Mandar direto do Instagram, sem copiar link

- **Android:** instale o app pelo Chrome (menu → *Instalar app*). Ele passa a
  aparecer no *Compartilhar* do Instagram.
- **iPhone:** o Safari não deixa site nenhum aparecer no *Compartilhar*. O
  caminho é um **atalho do app Atalhos**, que cada um monta em 1 minuto com o
  endereço pessoal mostrado na tela **Grupo**. O passo a passo está lá e em
  [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md#atalho-do-iphone). No
  Instagram: *Compartilhar → Mandar pra Viagem*, e o post chega à caixa de
  entrada já lido.

## O limite honesto do Instagram

O Instagram não deixa robô ler post. Pelo link, o que se consegue sem login é a
**legenda** e a capa — e muitos carrosséis de “10 lugares em Tulum” trazem a
lista na legenda, então funciona. Quando a lista está só **nas imagens**, ou
quando o Instagram fecha a porta (conta privada, ou às vezes sem motivo), o app
avisa e pede **os prints dos slides**. Com os prints, o Gemini lê cada imagem.
O áudio de um reel não é lido.

## Custo

Zero para um grupo de amigos:

| Peça | Serviço | Por quê |
|---|---|---|
| Servidor | Vercel (grátis) | o mesmo dos outros apps deste repositório |
| Banco | Neon/Postgres pela Vercel (grátis) | cada um vê o que os outros lançam |
| Leitura de posts | Gemini, chave do Google AI Studio (grátis) | lê imagem e devolve a lista em JSON |
| Achar o lugar no mapa | OpenStreetMap (grátis) ou Google Places (opcional) | ver abaixo |
| Navegação | links do Google Maps / Waze / Uber | o GPS do celular, sem API paga |
| Câmbio | open.er-api.com / Frankfurter (grátis) | sugestão; cada despesa pode corrigir |

No plano gratuito do Gemini, o Google pode usar o que passa por ele para
melhorar os modelos. Aqui passam posts públicos e prints — nada de documento ou
cartão.

**Achar o lugar:** sem configurar nada, a busca é no OpenStreetMap, restrita à
cidade e ao país da viagem (sem isso, “Contramar, Cidade do México” já foi
parar em Cuiabá). Acha bem restaurante conhecido, praia e museu; lugar pequeno
às vezes não — e aí ele fica sem ponto no mapa, mas o *Como chegar* continua
funcionando, porque manda o nome ao Google Maps. Com uma `GOOGLE_MAPS_API_KEY`
(Places API), a busca passa a ser a do Google, que acha quase tudo e faz o
*Ver no Maps* cair direto na ficha do lugar. A cota gratuita mensal do Google é
muito maior do que uma viagem gasta.

## Como o código está organizado

    prisma/schema.prisma   o banco, com as três decisões explicadas no topo
    src/lib/contas.ts      a divisão de contas — função pura, testada em contas.test.ts
    src/lib/dinheiro.ts    centavos ↔ "R$ 1.234,56", moedas
    src/lib/leitor.ts      post/print → lista de lugares (Gemini) e leitura de links
    src/lib/importar.ts    o caminho inteiro de "chegou um post" até a caixa de entrada
    src/lib/localizar.ts   nome → ponto no mapa (Google Places ou OpenStreetMap)
    src/lib/lugares.ts     categorias, links de rota (Maps, Waze, Uber), distância
    src/acoes/             as ações de servidor: viagem, lugares, roteiro, contas
    src/app/v/[id]/        as telas da viagem: início, lugares, mapa, caixa,
                           roteiro, contas, grupo
    src/app/api/atalho/    a porta do atalho do iPhone (chave pessoal, sem cookie)

Três regras que atravessam tudo:

1. **Dinheiro é inteiro, em centavos**, e toda divisão usa o método do maior
   resto: R$ 100 entre três dá 33,34 + 33,33 + 33,33, nunca 99,99. Despesa em
   outra moeda é convertida pelo total e repartida depois, para não nascer
   centavo fantasma.
2. **A tela sugere, o servidor decide.** A prévia da divisão usa a mesma função
   `dividir` que o servidor usa para gravar.
3. **Toda ação confere se quem pede é da viagem** (`exigirMembro`), e todo id
   que vem de formulário é procurado *dentro* da viagem.

## Rodar no computador

Precisa de um Postgres. Crie `viagem/.env`:

    DATABASE_URL="postgresql://usuario:senha@localhost:5432/viagem"
    AUTH_SECRET="um-texto-longo-qualquer-para-desenvolvimento"
    CODIGO_DE_FUNDACAO="mexico2026"
    GEMINI_API_KEY="..."        # opcional: sem ela, só link do Maps e nome digitado

e rode:

```sh
cd viagem
npm install
npx prisma migrate dev   # cria as tabelas
npm run dev              # http://localhost:3000
npm test                 # as regras da divisão, dos links e do leitor
npm run typecheck
```
