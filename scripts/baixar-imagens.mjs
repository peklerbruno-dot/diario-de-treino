// Baixa as fotos de execução do free-exercise-db (domínio público, Unlicense) e
// as encolhe para caberem no app, que precisa funcionar offline.
//
//   node scripts/baixar-imagens.mjs
//   REFAZER=1 node scripts/baixar-imagens.mjs   (regrava as que já existem)
//
// Só precisa rodar de novo se scripts/mapa-imagens.json mudar; as imagens ficam versionadas.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DESTINO = join(AQUI, "..", "public", "exercicios");
const FONTE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main";
const DADOS = `${FONTE}/dist/exercises.json`;
const LARGURA = 420; // pouco mais do que a ficha ocupa na tela do iPhone

const mapa = JSON.parse(readFileSync(join(AQUI, "mapa-imagens.json"), "utf8"));
const db = await (await fetch(DADOS)).json();
const porNome = new Map(db.map((e) => [e.name, e]));

mkdirSync(DESTINO, { recursive: true });

let feitas = 0;
let bytes = 0;
const semImagem = [];

for (const [id, nome] of Object.entries(mapa)) {
  const e = porNome.get(nome);
  if (!e?.images?.length) {
    semImagem.push(`${id} → ${nome}`);
    continue;
  }
  // O banco traz o início e o fim do movimento; as duas contam a execução.
  for (const [k, caminho] of e.images.slice(0, 2).entries()) {
    const saida = join(DESTINO, `${id}-${k}.webp`);
    if (existsSync(saida) && !process.env.REFAZER) {
      bytes += readFileSync(saida).length;
      continue;
    }
    const resp = await fetch(`${FONTE}/exercises/${caminho}`);
    if (!resp.ok) {
      semImagem.push(`${id} → ${caminho} (HTTP ${resp.status})`);
      continue;
    }
    const webp = await sharp(Buffer.from(await resp.arrayBuffer()))
      .resize({ width: LARGURA, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    writeFileSync(saida, webp);
    feitas++;
    bytes += webp.length;
  }
}

// Índice para o app saber, sem ir ao disco, quem tem foto e quantas.
const quantas = {};
for (const id of Object.keys(mapa)) {
  const n = [0, 1].filter((k) => existsSync(join(DESTINO, `${id}-${k}.webp`))).length;
  if (n) quantas[id] = n;
}
const lista = Object.entries(quantas)
  .sort((a, b) => a[0] - b[0])
  .map(([id, n]) => `${id}: ${n}`)
  .join(", ");
writeFileSync(
  join(AQUI, "..", "src", "dados", "fotos.js"),
  `// Gerado por scripts/baixar-imagens.mjs — não edite à mão.\n` +
    `// Fotos de execução do free-exercise-db (github.com/yuhonas/free-exercise-db), domínio público.\n` +
    `// id do exercício → quantos quadros do movimento existem em public/exercicios/.\n` +
    `const QUADROS = { ${lista} };\n\n` +
    `/** Caminhos das fotos do exercício, em ordem: início e fim do movimento. */\n` +
    `export const fotosDe = (id) =>\n` +
    `  Array.from({ length: QUADROS[id] || 0 }, (_, k) => \`/exercicios/\${id}-\${k}.webp\`);\n`
);

console.log(`${feitas} imagens novas · ${(bytes / 1024 / 1024).toFixed(2)} MB no total`);
console.log(`${Object.keys(quantas).length} exercícios com foto (src/dados/fotos.js atualizado)`);
if (semImagem.length) console.log("sem imagem:\n  " + semImagem.join("\n  "));
