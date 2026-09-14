# Diário de treino

App pessoal de treinos (musculação, pilates e natação) para iPhone. PWA em React + Vite,
sem servidor e sem login: os dados ficam no aparelho.

Etapa 1 de [`BRIEFING-diario-de-treino.md`](BRIEFING-diario-de-treino.md): projeto, PWA instalável
e tela inicial. O protótipo aprovado está em `diario-de-treino-v5.jsx`.

## Rodar no computador

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run preview  # serve dist/ — é aqui que o service worker funciona
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
