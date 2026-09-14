// Gera os ícones do PWA a partir do pictograma de halteres do protótipo.
// Sem dependências: desenha retângulos com anti-serrilhado e grava PNG via zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAPEL = [0xf6, 0xf3, 0xec];
const TINTA = [0x2b, 0x2a, 0x26];

// Halteres, no mesmo desenho do ícone "Treinos" do protótipo (viewBox 24×24).
const HALTER = [
  [2, 10, 3, 4],
  [19, 10, 3, 4],
  [5, 8, 3, 8],
  [16, 8, 3, 8],
  [8, 11.25, 8, 1.5], // a barra (traço de 1,5 de espessura em y=12)
];

function tela(lado, fundo) {
  const px = new Uint8Array(lado * lado * 3);
  for (let i = 0; i < lado * lado; i++) {
    px[i * 3] = fundo[0];
    px[i * 3 + 1] = fundo[1];
    px[i * 3 + 2] = fundo[2];
  }
  return px;
}

// Preenche um retângulo com cobertura fracionária, para as bordas não serrilharem.
function retangulo(px, lado, x0, y0, x1, y1, cor) {
  const ix0 = Math.max(0, Math.floor(x0));
  const iy0 = Math.max(0, Math.floor(y0));
  const ix1 = Math.min(lado, Math.ceil(x1));
  const iy1 = Math.min(lado, Math.ceil(y1));
  for (let y = iy0; y < iy1; y++) {
    const cy = Math.max(0, Math.min(y + 1, y1) - Math.max(y, y0));
    for (let x = ix0; x < ix1; x++) {
      const cx = Math.max(0, Math.min(x + 1, x1) - Math.max(x, x0));
      const a = cx * cy;
      if (a <= 0) continue;
      const i = (y * lado + x) * 3;
      for (let c = 0; c < 3; c++) px[i + c] = Math.round(px[i + c] * (1 - a) + cor[c] * a);
    }
  }
}

function png(px, lado) {
  const cru = Buffer.alloc(lado * (lado * 3 + 1));
  for (let y = 0; y < lado; y++) {
    cru[y * (lado * 3 + 1)] = 0; // filtro "none"
    Buffer.from(px.buffer, y * lado * 3, lado * 3).copy(cru, y * (lado * 3 + 1) + 1);
  }
  const crc32 = (buf) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const bloco = (tipo, dados) => {
    const t = Buffer.from(tipo, "latin1");
    const tam = Buffer.alloc(4);
    tam.writeUInt32BE(dados.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, dados])));
    return Buffer.concat([tam, t, dados, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(cru, { level: 9 })),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

// margem: fração do lado deixada livre de cada lado do desenho.
function icone(lado, margem) {
  const px = tela(lado, PAPEL);
  const util = lado * (1 - 2 * margem);
  const escala = util / 24;
  const desloc = lado * margem;
  for (const [x, y, l, a] of HALTER) {
    retangulo(px, lado, desloc + x * escala, desloc + y * escala, desloc + (x + l) * escala, desloc + (y + a) * escala, TINTA);
  }
  return png(px, lado);
}

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(raiz, { recursive: true });
const arquivos = [
  ["favicon.png", 32, 0.08],
  ["icone-192.png", 192, 0.14],
  ["icone-512.png", 512, 0.14],
  ["icone-mascara-512.png", 512, 0.26], // zona segura das máscaras do Android
  ["apple-touch-icon.png", 180, 0.14],
];
for (const [nome, lado, margem] of arquivos) {
  writeFileSync(join(raiz, nome), icone(lado, margem));
  console.log(`${nome} (${lado}×${lado})`);
}
