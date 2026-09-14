# Diário de treino

App pessoal de treinos (musculação, pilates e natação) para iPhone. PWA em React + Vite,
sem servidor e sem login: os dados ficam no aparelho.

As sete etapas de [`BRIEFING-diario-de-treino.md`](BRIEFING-diario-de-treino.md) estão prontas. O
protótipo aprovado está em `diario-de-treino-v5.jsx`.

## Detalhes de iPhone que o código já resolve

- Os campos de kg e reps **não** são `type="number"`: no teclado em português a tecla decimal é a
  vírgula, e um campo `number` descarta o que se digita com ela — "52,5" viraria vazio. São campos
  de texto com `inputMode`, que abrem o mesmo teclado numérico, aceitam a vírgula e a convertem em
  ponto só na hora de gravar.
- Áreas seguras respeitadas: entalhe, laterais e a faixa do gesto, incluindo o aviso flutuante e a
  folha da ficha.
- Campos com 17 px, para o Safari não dar zoom ao focar. `touch-action: manipulation` nos botões,
  para não haver atraso de duplo toque nem seleção de texto ao segurar.
- Ao voltar para o app ele procura uma versão nova em segundo plano, mas **não** recarrega a página
  sozinho: um treino em preenchimento não pode se perder. A versão nova entra na abertura seguinte.

## Escrever o treino em vez de preencher

Em Início → "Escrever o que fiz" dá para digitar o treino e o app monta o registro para você
conferir. A leitura é feita no próprio aparelho por `src/dados/interpretar.js` — sem chamada a
serviço nenhum, sem chave e sem custo, e funciona offline.

Entende, entre outras formas: `supino reto 3 de 10 com 50 kg`, `puxada 3x12 45`,
`4 séries de 8 a 60 quilos`, `supino 3x10 50/55/60` (uma carga por série),
`nadei 1000 m de crawl em 25 min`, `nadei 1,5 km`, `pilates de aparelho, 50 min`, `pilates 1h30`,
e datas como `ontem`, `sábado`, `dia 3`, `10/09`. Exercícios fora da biblioteca entram ao salvar,
com um palpite de grupo muscular que dá para corrigir depois na Biblioteca.

`npm test` roda as verificações dessa leitura — `testes/interpretar.test.mjs` serve também como
lista do que o app entende.

## Exportar e proteger os dados

Na tela Exportar, tudo é gerado no aparelho e entregue pelo share sheet do iOS (salvar nos
Arquivos, mandar por e-mail, abrir no Numbers):

- **PDF do mês** — cabeçalho com os totais, uma linha por treino com o detalhe, e uma seção por
  exercício de musculação com a evolução de carga. Feito com jsPDF, que é carregado assim que a
  tela abre para que o compartilhamento ainda conte como parte do seu toque (exigência do iOS).
- **Planilha CSV** — uma linha por série, com `;` e vírgula decimal, que é como o Excel e o
  Numbers em português esperam.
- **Backup JSON** — as quatro coleções inteiras. Restaurar mostra o que há no arquivo e só troca
  depois de confirmado. Vale o hábito: o Safari apaga dados de sites pouco usados.

## Fotos dos exercícios

As 134 fotos em `public/exercicios/` vêm do [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
que está sob a Unlicense (domínio público) — dataset e imagens. São dois quadros por exercício, o
início e o fim do movimento, reduzidos a 420 px de largura em WebP (1,7 MB no total) e guardados no
cache do app, para a ficha funcionar sem internet.

`scripts/mapa-imagens.json` liga cada um dos 67 exercícios de musculação ao nome correspondente no
acervo, conferido um a um. `node scripts/baixar-imagens.mjs` baixa, redimensiona e regrava
`src/dados/fotos.js`; só é preciso rodar de novo se o mapa mudar. Exercícios sem foto — os que você
criar — continuam com o pictograma do protótipo.

O vídeo é um link por exercício, colado na ficha: se for do YouTube, o tocador aparece embutido;
qualquer outro link vira um botão "Ver vídeo".

## Como o código está organizado

    src/App.jsx          navegação, sessão em registro, aviso e ficha do exercício
    src/telas/           uma tela por arquivo: Inicio, Registro, Treinos, Biblioteca,
                         Historico, Exportar
    src/componentes/     Figura (foto ou pictograma), Pict, Icone, Ficha do exercício
    src/dados/           bd.js (Dexie), biblioteca.js, constantes.js, calculos.js,
                         interpretar.js (texto livre → registro),
                         relatorio.js (PDF, planilha, backup)
    src/estilo.css       o visual da seção 7, com os ajustes de iPhone

As telas não falam com o IndexedDB por conta própria: leem as listas que o `App` traz pelo
`useLiveQuery` e escrevem pelo `db`, de modo que qualquer gravação se reflete na hora em todas
as telas.

## Onde ficam os dados

Tudo em IndexedDB, no próprio aparelho, pelo Dexie (`src/dados/bd.js`). Quatro coleções:
`exercicios`, `treinos` (modelos), `sessoes` (registros) e `ajustes`. A biblioteca inicial de 76
exercícios (`src/dados/biblioteca.js`, a mesma do protótipo) é carregada na primeira abertura; uma
marca em `ajustes` impede que exercícios apagados voltem sozinhos.

## Rodar no computador

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve dist/ — é aqui que o service worker funciona
npm test         # verifica a leitura do texto livre, o relatório e o backup
```

O service worker só é gerado no `build`, então o teste de offline se faz com `npm run preview`,
não com `npm run dev`.

Os ícones em `public/` são gerados por `npm run icones` (a partir do pictograma de halteres do
protótipo). Já estão versionados; só rode de novo se mudar o desenho.

## Publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) com a conta do GitHub.
2. **Add New… → Project** e escolha o repositório `diario-de-treino`.
3. A Vercel detecta Vite sozinha — não mexa em nada (Framework: Vite, Build: `npm run build`,
   Output: `dist`). Clique em **Deploy**.
4. Em um ou dois minutos sai a URL `https://<nome>.vercel.app`, já com HTTPS.

Depois disso, todo push para `main` publica a versão nova; pushes em outras branches viram uma
URL de *preview* separada, que é a que serve para testar cada etapa no iPhone antes de juntar
tudo em `main`.

## Instalar no iPhone

Abra a URL no **Safari** (não funciona pelo Chrome no iOS), toque em Compartilhar e escolha
**Adicionar à Tela de Início**. O app passa a abrir em janela própria, sem barra de endereço, e
continua funcionando sem internet.

Para pegar uma versão nova depois de um deploy: abra o app e feche; ele baixa a atualização em
segundo plano e ela aparece na abertura seguinte.

---

## Outro projeto neste repositório

`machanot/` guarda a plataforma de precificação de machanot da Chazit Hanoar —
um app Next.js independente deste diário, com o seu próprio `package.json`.
Veja `machanot/README.md`.
