/**
 * Desenha os ícones do app: um prato visto de cima, com uma folha.
 *
 * Os arquivos ficam versionados em public/. Só é preciso rodar de novo se o
 * desenho mudar:
 *
 *     npm run icones
 */
import sharp from "sharp";

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#23784a"/>
  <circle cx="256" cy="256" r="168" fill="#f3f3ef"/>
  <circle cx="256" cy="256" r="124" fill="none" stroke="#d9dbd4" stroke-width="10"/>
  <path d="M196 318 C 196 228, 254 180, 334 176 C 334 260, 286 318, 196 318 Z" fill="#23784a"/>
  <path d="M196 318 C 236 278, 270 244, 312 204" fill="none" stroke="#f3f3ef" stroke-width="12" stroke-linecap="round"/>
</svg>`;

for (const [lado, nome] of [
  [180, "apple-touch-icon.png"],
  [192, "icone-192.png"],
  [512, "icone-512.png"],
]) {
  await sharp(Buffer.from(SVG)).resize(lado, lado).png().toFile(`public/${nome}`);
  console.log(`public/${nome}`);
}
