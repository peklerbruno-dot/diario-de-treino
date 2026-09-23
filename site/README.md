# Site da Chazit Hanoar São Paulo

O site público do movimento — início, a Chazit, shichvot, agenda, chadashot,
fotos e contato — com a identidade visual do manual (marinho `#2B3278`, azul
`#3C91E6` e as cores de apoio; Montserrat nos títulos, Lato no texto).

A equipe edita **no próprio site**. Quem entra pela "Área da equipe" (no rodapé)
passa a ver, em cada parte da página, um botão amarelo **✏️ Editar** e, no fim
de cada lista, **+ Adicionar**. Não existe painel separado para aprender: a
página que se vê é a página que se edita.

- Quem só quer colocar no ar: [`docs/COLOCAR-NO-AR.md`](docs/COLOCAR-NO-AR.md).
- Para mandar para quem vai editar: [`docs/COMO-EDITAR.md`](docs/COMO-EDITAR.md).

## A porta da equipe

Nome + um código combinado (`CODIGO_DE_EDICAO`). É o mesmo modelo da plataforma
de machanot: sem conta por pessoa, porque quem edita muda a cada ano. O nome não
é conferido; ele serve para o histórico do painel dizer quem mudou o quê.

## O que se edita

Tudo o que é editável está descrito em [`src/lib/esquema.ts`](src/lib/esquema.ts):

- **Blocos** — partes únicas (capa, quem somos, história, contato, faixa de
  aviso, "apoie"). Enquanto ninguém edita, aparece o texto inicial de
  [`src/lib/padrao.ts`](src/lib/padrao.ts).
- **Listas** — pilares, shichvot, agenda, notícias, fotos e documentos.
  Agenda e notícias se ordenam pela data; o resto, pelas setas ← →.

O formulário, a validação e o conteúdo inicial saem desse arquivo. Para um campo
novo numa seção basta acrescentá-lo lá — não há migração nem formulário para
escrever.

Nada some: apagar oferece "Desfazer" na hora e guarda o item na lixeira do
painel (`/painel`). "Esconder" deixa algo só para a equipe (rascunho).

Campos vazios não aparecem para o visitante. É por isso que endereço, WhatsApp,
e-mail e Instagram começam vazios: não havia como saber, e um contato inventado
seria pior que nenhum.

## Fotos e PDFs

Ficam no próprio banco (tabela `Arquivo`), para não haver um segundo serviço a
configurar. O navegador reduz cada foto para no máximo 1600 px antes de enviar
(em torno de 300 KB), e `/arquivos/[id]` as entrega com cache de um ano — um
arquivo nunca muda depois de enviado. O limite por arquivo é 4 MB, por causa do
limite de 4,5 MB por pedido da Vercel.

## Rodar no computador

```sh
npm install
cp .env.example .env          # ajuste DATABASE_URL e escolha um CODIGO_DE_EDICAO
npx prisma migrate dev
npm run dev                   # http://localhost:3000
npm test                      # links, datas, texto e validação
npm run typecheck
```

Na primeira abertura com o banco vazio, o site cria sozinho os pilares, as
shichvot, duas atividades e uma notícia de exemplo, para ninguém encontrar um
site em branco.

## Onde as coisas estão

```
src/lib/esquema.ts        o que é editável, campo por campo
src/lib/padrao.ts         o texto com que o site nasce
src/lib/conteudo.ts       leitura do banco (e o conteúdo da primeira abertura)
src/lib/acoes.ts          toda escrita: sessão, validação, histórico
src/lib/auth.ts           a porta: nome + código, cookie assinado
src/componentes/edicao/   botões Editar/Adicionar, painel lateral, envio de fotos
src/componentes/Pecas.tsx cartões de atividade, notícia, shichvá, pilar
src/app/                  uma pasta por página
```
