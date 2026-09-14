# Site da Chazit Hanoar São Paulo

Uma versão nova do [chazit.org.br](http://chazit.org.br/principal.php/), feita para custar **zero
por mês** e para ser lida no celular, que é onde os pais abrem o site.

O site antigo é um WordPress 4.4 de 2016 rodando em hospedagem paga, com plugins abandonados
(galeria, slider, tabs), sem HTTPS e sem versão para celular. Aqui não há WordPress, banco de
dados nem painel: são páginas HTML prontas, que qualquer hospedagem estática serve de graça.
O conteúdo é o mesmo — história, ideologia, mishná, concepção educativa, Pirkei Hapeilim,
organograma, FAQ e o Milon inteiro —, reescrito no visual de agora.

## O que mudou, além do visual

- **Milon com busca.** Os 1.367 verbetes e os 92 termos da tnuá estão em uma página só, com busca
  instantânea que ignora acento e procura no meio da palavra. No site antigo a instrução era
  “segure CTRL e aperte F”.
- **Funciona no celular.** Menu que abre, tipografia que cabe na tela, nada que role de lado.
- **Tema claro e escuro**, seguindo o aparelho de quem abre.
- **Sem JavaScript também funciona**: o script só melhora o menu e a busca.
- **Contatos por cargo, não por pessoa.** O site antigo publicava celulares pessoais de madrichim
  de 2021 e 2023, que mudam todo ano. Aqui tudo chega pelo e-mail e pelo telefone da tnuá.

## Como mexer

```bash
node construir.mjs      # gera o site/ a partir do conteúdo. Sem dependências, sem npm install.
```

Depois é só abrir `site/index.html` no navegador. Para ver como um servidor de verdade:

```bash
npx serve site          # ou: python3 -m http.server -d site
```

Onde mexer em cada coisa:

| quero mudar | mexo em |
|---|---|
| o texto de uma página | `conteudo/<pagina>.html` — é HTML puro, sem nada de esquisito |
| título, descrição e ordem no menu | `conteudo/paginas.json` |
| cores, tamanhos, espaçamentos | `estatico/estilo.css` (as cores estão todas no topo) |
| cabeçalho, rodapé, redes sociais | `modelo/pagina.html` |
| o dicionário | `dados/milon.json` e `dados/termos.json` |
| fotos | `estatico/imagens/` |

Criar uma página nova: escreva `conteudo/nova.html`, acrescente uma entrada em
`conteudo/paginas.json` (e no `menu`, se ela deve aparecer lá) e rode `node construir.mjs`.

**A pasta `site/` é gerada.** Não edite nada lá dentro: o próximo `construir.mjs` apaga tudo e
escreve de novo.

## Como colocar no ar de graça

A pasta `site/` é o site inteiro — HTML, CSS, JS e imagens, 940 kB. Qualquer uma destas serve, e
todas têm HTTPS e domínio próprio no plano gratuito:

- **GitHub Pages** — nas configurações do repositório, Pages → Deploy from a branch, e aponte para
  a pasta. É o mais simples se o código já está no GitHub.
- **Netlify** — arraste a pasta `site/` na tela do Netlify Drop e o site está no ar em segundos.
  Para atualizar sozinho a cada push: build command `node construir.mjs`, publish directory `site`.
- **Cloudflare Pages** ou **Vercel** — mesma configuração do Netlify.

Para usar `chazit.org.br`, aponte o DNS do domínio para o serviço escolhido; o certificado HTTPS
sai automático. Enquanto o domínio antigo estiver no ar, dá para publicar em um subdomínio
(`novo.chazit.org.br`) e trocar quando a tnuá aprovar.

Se o endereço final não for `https://chazithanoarsp.org.br`, troque o campo `site` no começo de
`conteudo/paginas.json` — ele alimenta o `sitemap.xml` e as tags de compartilhamento.

## Antes de trocar o site oficial

Três coisas dependem de gente da tnuá, não de código:

1. **Conferir os contatos** em `conteudo/contato.html`. Hoje tudo aponta para
   `chazit@chazit.org.br` e `(11) 2808-6214`. Se a mazkirut tiver e-mails por tafkid, é melhor.
2. **Fotos novas.** As que estão aqui vieram do site antigo — o mifkad e a machané são de uma
   década atrás. Um sábado de fotos resolve. Peça também autorização de imagem às famílias antes
   de publicar foto de chanich.
3. **O semel.** `estatico/semel.svg` é um desenho novo das letras chet e nun, feito para funcionar
   em 32 px. Se a tnuá tiver o arquivo vetorial oficial, é só substituir (e trocar também
   `estatico/imagens/semel-180.png`).

Ficaram de fora, de propósito: a galeria de vídeos da home (os links do YouTube do site antigo
estão quase todos quebrados) e o login do WordPress. Parshiot e CiberSio são de outros snifim e
continuam nos sites deles.

## De onde veio o conteúdo

Os textos são da Chazit Hanoar São Paulo, tirados do site antigo em setembro de 2026: Plataforma
Ideológica (Pemach 2007, com emendas de 2010 e 2019), Mishná, Concepção Educativa, Pirkei
Hapeilim, Missão & Visão (Pemach 2009), História, Organograma, FAQ (atualizado em 28/03/2021) e o
Milon, adaptado do site da Chazit Porto Alegre.

Na conversão, os verbetes do Milon foram remontados a partir do HTML antigo: o hebraico vinha com
as letras separadas por espaço (`כ ד י`) e foi juntado em palavras. Se algum verbete tiver ficado
com duas palavras coladas, é aí que está a origem — corrija direto em `dados/milon.json`.
