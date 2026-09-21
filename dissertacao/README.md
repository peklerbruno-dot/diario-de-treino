# Site da dissertação

Página estática que apresenta a dissertação de mestrado *O papel do sionismo na
identidade judaica em estudantes judeus de graduação em São Paulo* (Bruno Pekler,
FFLCH-USP, 2026).

- `index.html` — a página inteira: HTML, CSS e JS em um único arquivo, sem dependências
  além das fontes do Google Fonts.
- `dissertacao-bruno-pekler.pdf` — o texto integral, aberto pelos botões da página.

## Ver localmente

Basta abrir `index.html` no navegador. Para servir por HTTP:

```
python3 -m http.server -d dissertacao 8000
```

## Publicar

Qualquer hospedagem de arquivos estáticos serve (Vercel, Netlify, GitHub Pages):
suba a pasta `dissertacao/` inteira, mantendo o PDF ao lado do `index.html`.

## O que a página traz

Resumo em português e inglês, objetivos, metodologia (incluindo o desenho da amostra
e o parecer de ética), as chaves teóricas, a linha do tempo das correntes sionistas e
de sua institucionalização no Brasil, o perfil dos nove entrevistados, o espectro de
posições, os achados do capítulo 7, o diálogo com o estudo norte-americano, as
considerações finais e o sumário completo.

O posicionamento dos entrevistados na linha do espectro é uma leitura editorial feita
para o site — a dissertação organiza o material em eixos temáticos e não atribui
pontuação aos entrevistados.
