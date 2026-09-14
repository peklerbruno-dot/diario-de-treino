// Relatório do mês, planilha e backup. Rode com: npm test
import { dadosDoMes, gerarCSV, montarBackup, conferirBackup } from "../src/dados/relatorio.js";
import { bibliotecaInicial as BIB } from "../src/dados/biblioteca.js";

let falhas = 0;
const ok = (c, m, x) => { if (!c) falhas++; console.log((c ? "  ok  " : "FALHA ") + m + (c ? "" : " → " + JSON.stringify(x))); };

const SS = [
  { id: 1, data: "2026-09-03", mod: "musc", nome: "A · Peito", itens: [{ exId: 1, series: [{ carga: 50, reps: 10 }, { carga: 55, reps: 8 }] }, { exId: 34, series: [{ carga: 30, reps: 12 }] }] },
  { id: 2, data: "2026-09-10", mod: "musc", nome: "A · Peito", itens: [{ exId: 1, series: [{ carga: 57.5, reps: 10 }] }] },
  { id: 3, data: "2026-09-05", mod: "natacao", nome: "Nado", itens: [{ exId: 301, metros: 1200, tempoMin: 30 }] },
  { id: 4, data: "2026-09-07", mod: "pilates", nome: "Pilates", duracaoMin: 50, obs: "reformer" },
  { id: 5, data: "2026-08-20", mod: "musc", nome: "B · Costas", itens: [{ exId: 10, series: [{ carga: 60, reps: 10 }] }] },
];

console.log("--- relatório do mês");
{
  const d = dadosDoMes(SS, BIB, "2026-09");
  ok(d.linhas.length === 4, "só entram os treinos do mês pedido", d.linhas.length);
  ok(d.kg === 1875 && d.metros === 1200 && d.minutos === 50, "totais por modalidade", d);
  ok(d.linhas[0].detalhe === "Supino reto com barra: 50×10, 55×8 · Tríceps pulley: 30×12", "detalhe da musculação", d.linhas[0]);
  ok(d.linhas[1].detalhe === "Crawl 1.200 m em 30 min", "detalhe da natação", d.linhas[1]);
  ok(d.linhas[2].detalhe === "reformer", "observação do pilates vira o detalhe", d.linhas[2]);
  ok(d.evolucao.length === 2, "uma seção por exercício de musculação do mês", d.evolucao.map((e) => e.nome));
  const supino = d.evolucao.find((e) => e.nome === "Supino reto com barra");
  ok(supino.pontos.length === 2 && supino.pontos[0].carga === 55, "a carga do dia é a série mais pesada", supino.pontos);
  ok(supino.variacao === 2.5, "variação do mês", supino.variacao);
  ok(dadosDoMes(SS, BIB, "2026-07").linhas.length === 0, "mês sem treino sai vazio");
}

console.log("\n--- planilha");
{
  const linhas = gerarCSV(SS, BIB).replace(/^﻿/, "").trim().split("\r\n");
  ok(gerarCSV(SS, BIB).startsWith("﻿"), "leva BOM, para os acentos abrirem certo no Excel");
  ok(linhas.length === 8, "uma linha por série, mais o cabeçalho", linhas.length);
  ok(linhas[1] === "2026-08-20;Musculação;B · Costas;Puxada frontal;Costas;1;60;10;;;", "linha de musculação", linhas[1]);
  ok(linhas.some((l) => l.includes(";57,5;")), "decimal com vírgula");
  ok(linhas.some((l) => l.endsWith("Crawl;Estilo;;;;1200;30;")), "natação com metros e minutos");
  ok(linhas.some((l) => l.endsWith("Pilates;;;;;;;50;reformer")), "pilates com duração e observação");
  const comPontoEVirgula = gerarCSV([{ id: 9, data: "2026-09-01", mod: "pilates", nome: "P", duracaoMin: 30, obs: 'a; b "c"' }], BIB);
  ok(comPontoEVirgula.includes('"a; b ""c"""'), "texto com ponto e vírgula e aspas sai protegido", comPontoEVirgula.split("\r\n")[1]);
}

console.log("\n--- backup");
{
  const b = montarBackup({ exercicios: BIB, treinos: [], sessoes: SS, ajustes: [{ chave: "x", valor: 1 }] });
  ok(b.app === "diario-de-treino" && b.versao === 1, "backup se identifica");
  ok(b.sessoes.length === 5 && b.exercicios.length === 76, "backup leva tudo");
  ok(conferirBackup(b) === null, "backup recém-feito passa na conferência");
  ok(conferirBackup(null) !== null, "arquivo vazio é recusado");
  ok(conferirBackup({ app: "outro" }) !== null, "arquivo de outro app é recusado");
  ok(conferirBackup({ app: "diario-de-treino", versao: 1, exercicios: [], treinos: [] }) !== null, "falta de tabela é recusada");
  ok(conferirBackup({ ...b, versao: 99 }) !== null, "backup de versão futura é recusado");
  ok(JSON.parse(JSON.stringify(b)).sessoes[0].itens[0].series[0].carga === 50, "sobrevive a ida e volta em JSON");
}

console.log(falhas ? `\n${falhas} FALHAS` : "\ntudo certo");
process.exit(falhas ? 1 : 0);
