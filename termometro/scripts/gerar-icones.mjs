/**
 * Desenha os ícones do app: o selo "BP" — quadrado escuro, as duas letras em
 * serifa e o traço verde de "sobrou" embaixo. É o mesmo desenho do componente
 * `SeloBP` (src/componentes/marca.tsx), que o app mostra no menu e na entrada.
 *
 * Os arquivos ficam versionados em public/. Só é preciso rodar de novo se o
 * desenho mudar:
 *
 *     node scripts/gerar-icones.mjs
 *
 * Usa o Chromium do Playwright para desenhar (`npm i -g playwright` se não
 * tiver) e a serifa Liberation Serif.
 * O ícone "maskable" (o do Android) tem as letras menores: o sistema recorta
 * a borda em círculo ou gota, e só os 80% do centro estão garantidos.
 */
import { chromium } from "playwright";

const html = (px, escala) => `<!doctype html><html><body style="margin:0">
<div style="width:${px}px;height:${px}px;background:#111114;display:flex;flex-direction:column;align-items:center;justify-content:center">
  <div style="font-family:'Liberation Serif',serif;font-weight:700;color:#fff;font-size:${px * 0.44 * escala}px;line-height:1;letter-spacing:-0.02em;margin-top:${px * 0.03 * escala}px">BP</div>
  <div style="width:${px * 0.36 * escala}px;height:${px * 0.055 * escala}px;border-radius:999px;background:#3fbf7f;margin-top:${px * 0.035 * escala}px"></div>
</div></body></html>`;

const ICONES = [
  ["icone-512.png", 512, 1],
  ["icone-192.png", 192, 1],
  ["apple-touch-icon.png", 180, 1],
  ["icone-maskable-512.png", 512, 0.78],
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const [nome, px, escala] of ICONES) {
  await pagina.setViewportSize({ width: px, height: px });
  await pagina.setContent(html(px, escala));
  await pagina.screenshot({ path: new URL(`../public/${nome}`, import.meta.url).pathname });
  console.log(`public/${nome}`);
}
await navegador.close();
