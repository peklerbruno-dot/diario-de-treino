/**
 * Gera os ícones do app a partir de um SVG: um cacto sobre o rosa mexicano.
 * `node scripts/gerar-icones.mjs`.
 * Os PNGs já estão versionados; só rode de novo se mudar o desenho.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// O sharp vem junto com o Next (é o que ele usa para otimizar imagens).
const require = createRequire(new URL("../package.json", import.meta.url));
const sharp = require("sharp");
const publico = fileURLToPath(new URL("../public/", import.meta.url));

const svg = (lado) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#c2185b"/>
  <circle cx="370" cy="150" r="54" fill="#ffc94d"/>
  <g fill="#ffffff">
    <rect x="221" y="120" width="70" height="300" rx="35"/>
    <rect x="131" y="190" width="54" height="130" rx="27"/>
    <rect x="131" y="280" width="120" height="50" rx="25"/>
    <rect x="327" y="230" width="54" height="110" rx="27"/>
    <rect x="261" y="300" width="120" height="50" rx="25"/>
  </g>
  <rect x="96" y="410" width="320" height="16" rx="8" fill="#ffffff" opacity=".85"/>
</svg>`);

for (const [nome, lado] of [["icone-192.png", 192], ["icone-512.png", 512], ["apple-touch-icon.png", 180], ["favicon.png", 64]]) {
  await sharp(svg(lado)).png().toFile(publico + nome);
  console.log("gerado", nome);
}
