/* Gera o site estático em site/ a partir do modelo, do conteúdo e dos dados.
   Sem dependências: `node construir.mjs` e pronto. */

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = dirname(fileURLToPath(import.meta.url))
const caminho = (...partes) => join(raiz, ...partes)

const ler = (...partes) => readFile(caminho(...partes), 'utf8')
const lerJson = async (...partes) => JSON.parse(await ler(...partes))

const escapar = (texto) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const semAcento = (texto) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/* ------------------------------------------------------------- navegação */

function montarMenu (menu, urlAtual) {
  return menu.map((item, indice) => {
    if (item.itens) {
      const id = `submenu-${indice}`
      const aqui = item.itens.some((filho) => filho.url === urlAtual)
      const filhos = item.itens.map((filho) => `
          <li><a href="${filho.url}"${filho.url === urlAtual ? ' aria-current="page"' : ''}>${filho.rotulo}</a></li>`).join('')

      return `<li>
        <button class="abridor" type="button" aria-expanded="false" aria-controls="${id}"${aqui ? ' aria-current="page"' : ''}>
          ${item.rotulo}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <ul class="submenu" id="${id}" data-aberto="nao">${filhos}
        </ul>
      </li>`
    }

    const classe = item.destaque ? ' class="destaque-menu"' : ''
    const atual = item.url === urlAtual ? ' aria-current="page"' : ''
    return `<li><a href="${item.url}"${classe}${atual}>${item.rotulo}</a></li>`
  }).join('\n        ')
}

/* ----------------------------------------------------------------- milon */

function montarVerbetes (verbetes) {
  const inicial = (palavra) => {
    const letra = semAcento(palavra).trim().charAt(0).toUpperCase()
    return /[A-Z]/.test(letra) ? letra : '#'
  }

  const letras = []
  let atual = null
  const partes = []

  for (const verbete of verbetes) {
    const letra = inicial(verbete.pt)
    if (letra !== atual) {
      atual = letra
      letras.push(letra)
      partes.push(`<h2 class="letra" id="letra-${letra === '#' ? 'numeros' : letra.toLowerCase()}">${letra}</h2>`)
    }
    const busca = escapar(semAcento(`${verbete.pt} ${verbete.tr}`) + ' ' + verbete.he)
    partes.push(
      `<div class="verbete" data-busca="${busca}">` +
      `<span class="pt">${escapar(verbete.pt)}</span>` +
      (verbete.tr ? `<span class="tr">${escapar(verbete.tr)}</span>` : '') +
      (verbete.he ? `<span class="he" lang="he">${escapar(verbete.he)}</span>` : '') +
      '</div>'
    )
  }

  const alfabeto = letras.map((letra) =>
    `<a href="#letra-${letra === '#' ? 'numeros' : letra.toLowerCase()}">${letra}</a>`).join('')

  return { verbetes: partes.join('\n'), alfabeto, total: verbetes.length }
}

function montarTermos (termos) {
  return termos.map((item) => {
    const busca = escapar(semAcento(`${item.termo} ${item.significado}`))
    return `<div class="verbete termo" data-busca="${busca}">` +
      `<span class="pt">${escapar(item.termo)}</span>` +
      `<span class="tr">${escapar(item.significado)}</span></div>`
  }).join('\n')
}

/* ---------------------------------------------------------------- páginas */

const { site, menu, paginas } = await lerJson('conteudo', 'paginas.json')
const modelo = await ler('modelo', 'pagina.html')
const semel = (await ler('estatico', 'semel.svg')).replace(/\n\s*/g, ' ').trim()
const milon = montarVerbetes(await lerJson('dados', 'milon.json'))
const termos = montarTermos(await lerJson('dados', 'termos.json'))
const ano = new Date().getFullYear()

await rm(caminho('site'), { recursive: true, force: true })
await mkdir(caminho('site'), { recursive: true })
await cp(caminho('estatico'), caminho('site', 'estatico'), { recursive: true })

for (const pagina of paginas) {
  const conteudo = (await ler('conteudo', pagina.arquivo))
    .replaceAll('{{verbetes}}', milon.verbetes)
    .replaceAll('{{alfabeto}}', milon.alfabeto)
    .replaceAll('{{total_verbetes}}', String(milon.total).replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
    .replaceAll('{{termos}}', termos)
    .replaceAll('{{total_termos}}', String(termos.split('\n').length))
    .replaceAll('{{total_geral}}', String(milon.total + termos.split('\n').length)
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.'))

  const html = modelo
    .replaceAll('{{titulo_aba}}', escapar(pagina.aba))
    .replaceAll('{{descricao}}', escapar(pagina.descricao))
    .replaceAll('{{url}}', pagina.url)
    .replaceAll('{{site}}', site)
    .replaceAll('{{semel}}', semel)
    .replaceAll('{{menu}}', montarMenu(menu, pagina.url))
    .replaceAll('{{ano}}', String(ano))
    .replaceAll('{{conteudo}}', conteudo)

  await writeFile(caminho('site', pagina.url), html)
  console.log('  ', pagina.url.padEnd(28), Math.round(html.length / 1024) + ' kB')
}

/* ------------------------------------------------------ mapa e robôs */

const mapa = paginas
  .filter((pagina) => !pagina.fora_do_mapa)
  .map((pagina) => `  <url><loc>${site}/${pagina.url === 'index.html' ? '' : pagina.url}</loc></url>`)
  .join('\n')

await writeFile(caminho('site', 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${mapa}\n</urlset>\n`)

await writeFile(caminho('site', 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`)

console.log(`\nPronto: ${paginas.length} páginas em site/ (${milon.total} verbetes no Milon).`)
