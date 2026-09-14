// Como o app entende o que você escreve. Rode com: npm test
import { interpretar } from "../src/dados/interpretar.js";
import { bibliotecaInicial as BIB } from "../src/dados/biblioteca.js";

const HOJE = "2026-09-14"; // uma segunda-feira
const nomeDe = (id) => BIB.find((e) => e.id === id)?.nome;
let falhas = 0;
const ok = (c, m, extra) => { if (!c) falhas++; console.log((c ? "  ok  " : "FALHA ") + m + (c ? "" : "  → " + JSON.stringify(extra))); };

// resumo legível de um item de musculação: "Nome 3x10 50"
const resumo = (r) => (r?.itens || []).map((i) => {
  const n = i.exId ? nomeDe(i.exId) : `+${i.nome}(${i.cat})`;
  if (r.mod === "natacao") return `${n} ${i.metros}m ${i.tempoMin}min`;
  const s = i.series;
  const cargas = [...new Set(s.map((x) => x.carga))].join("/");
  return `${n} ${s.length}x${s[0].reps} ${cargas}`;
}).join(" | ");

const caso = (texto, esperado, campo = "resumo") => {
  const r = interpretar(texto, BIB, HOJE);
  const obtido = campo === "resumo" ? resumo(r) : r?.[campo];
  ok(obtido === esperado, `"${texto}" → ${esperado}`, { obtido, r });
};

console.log("--- os exemplos que o briefing exige");
caso("supino reto 3 de 10 com 50 kg", "Supino reto com barra 3x10 50");
caso("puxada 3x12 45", "Puxada frontal 3x12 45");
caso("4 séries de 8 a 60 quilos no supino", "Supino reto com barra 4x8 60");
caso("nadei 1000 m de crawl em 25 min", "Crawl 1000m 25min");
caso("pilates de aparelho, 50 min", 50, "duracaoMin");
caso("pilates de aparelho, 50 min", "Pilates de aparelho", "nome");
caso("ontem fiz supino 3x10 com 50", "2026-09-13", "data");

console.log("\n--- várias formas de escrever séries e carga");
caso("supino 3x10 50", "Supino reto com barra 3x10 50");
caso("supino 3 x 10 50kg", "Supino reto com barra 3x10 50");
caso("supino 3 séries de 10 com 50 kg", "Supino reto com barra 3x10 50");
caso("supino 3 de 10 a 50", "Supino reto com barra 3x10 50");
caso("supino 3x10 com 52,5 kg", "Supino reto com barra 3x10 52.5");
caso("supino 3x10 @ 50", "Supino reto com barra 3x10 50");
caso("supino 3x10 50/55/60", "Supino reto com barra 3x10 50/55/60");
caso("supino 10 reps com 50 kg", "Supino reto com barra 1x10 50");

console.log("\n--- reconhecer o exercício");
caso("leg 4x12 200", "Leg press 45° 4x12 200");
caso("leg press 45 4x12 200", "Leg press 45° 4x12 200");
caso("rosca martelo 3x12 14", "Rosca martelo 3x12 14");
caso("triceps corda 3x15 30", "Tríceps corda 3x15 30");
caso("cadeira extensora 3x15 45", "Cadeira extensora 3x15 45");
caso("agachamento búlgaro 3x10 20", "Agachamento búlgaro 3x10 20");
caso("elevação lateral 4x15 8", "Elevação lateral 4x15 8");
caso("supino inclinado com halteres 3x10 22", "Supino inclinado com halteres 3x10 22");
caso("levantamento terra 5x5 100", "Levantamento terra 5x5 100");
caso("barra fixa 3x8", "Barra fixa 3x8 ");

console.log("\n--- vários exercícios no mesmo texto");
caso("supino reto 3 de 10 com 50 kg, puxada 3x12 com 45 e rosca direta 3 de 10 com 20",
  "Supino reto com barra 3x10 50 | Puxada frontal 3x12 45 | Rosca direta com barra 3x10 20");
caso("supino 3x10 50 puxada 3x12 45",
  "Supino reto com barra 3x10 50 | Puxada frontal 3x12 45");
caso("supino reto com barra 3x10 50, barra fixa 3x8",
  "Supino reto com barra 3x10 50 | Barra fixa 3x8 ");
caso("hoje: supino 3x10 50\npuxada 3x12 45\nrosca 3x10 20",
  "Supino reto com barra 3x10 50 | Puxada frontal 3x12 45 | Rosca direta com barra 3x10 20");

console.log("\n--- natação");
caso("nadei 1200 m em 30 min", "Crawl 1200m 30min");
caso("natação: 500 m de crawl e 300 m de costas", "Crawl 500m min | Costas 300m min");
caso("nadei 800 metros de peito em 22 minutos", "Peito 800m 22min");
caso("nadei 400 m de borboleta", "Borboleta 400m min");

console.log("\n--- pilates");
caso("pilates 50 min", 50, "duracaoMin");
caso("pilates no reformer, 1 hora", "Pilates de aparelho", "nome");
caso("fiz mat pilates 45 minutos", "Pilates de solo", "nome");
caso("pilates de aparelho, 50 min", "pilates", "mod");

console.log("\n--- datas");
caso("anteontem supino 3x10 50", "2026-09-12", "data");
caso("supino 3x10 50", HOJE, "data");
caso("sábado fiz supino 3x10 50", "2026-09-12", "data");
caso("sexta supino 3x10 50", "2026-09-11", "data");
caso("dia 3 supino 3x10 50", "2026-09-03", "data");
caso("10/09 supino 3x10 50", "2026-09-10", "data");
caso("20/12 supino 3x10 50", "2025-12-20", "data"); // ainda não chegou em 2026

console.log("\n--- exercício fora da biblioteca");
{
  const r = interpretar("supino 3x10 50, voador invertido 3x12 30", BIB, HOJE);
  ok(r.itens.length === 2 && r.itens[1].exId === null && r.itens[1].nome === "Voador invertido",
    "exercício desconhecido entra como novo", r.itens[1]);
  ok(r.novos.length === 1 && r.novos[0] === "Voador invertido", "e é listado em novos", r.novos);
}

console.log("\n--- o que não dá para entender");
{
  ok(interpretar("", BIB, HOJE) === null, "texto vazio devolve null");
  ok(interpretar("bom treino hoje", BIB, HOJE) === null, "texto sem números devolve null");
  const r = interpretar("supino 3x10 50, foi puxado demais", BIB, HOJE);
  ok(r.itens.length === 1, "trecho sem exercício não vira item", r.itens);
}

console.log("\n--- nome do treino");
caso("supino 3x10 50, crucifixo 3x12 20", "Peito", "nome");
caso("supino 3x10 50, rosca direta 3x10 20", "Peito e Bíceps", "nome");
caso("nadei 1000 m", "Natação", "nome");

console.log("\n--- horas e quilômetros");
caso("pilates no reformer, 1 hora", 60, "duracaoMin");
caso("pilates 1h30", 90, "duracaoMin");
caso("pilates de solo 1h", 60, "duracaoMin");
caso("nadei 1,5 km em 40 min", "Crawl 1500m 40min");
caso("nadei 2km de crawl", "Crawl 2000m min");
caso("nadei 1000 m em 1 hora", "Crawl 1000m 60min");

console.log(falhas ? `\n${falhas} FALHAS` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
