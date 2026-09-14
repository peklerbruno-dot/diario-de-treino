// Relatório do mês, planilha e backup — tudo montado no próprio aparelho.
import { MOD, ORDEM } from "./constantes.js";
import { fmt, volume, metros, resumo, mesNome, numBR } from "./calculos.js";

/** Junta o que o relatório do mês precisa mostrar. Função pura, para poder ser conferida. */
export function dadosDoMes(sessoes, exercicios, ym) {
  const nome = (id) => exercicios.find((e) => e.id === id)?.nome || "Exercício";
  const doMes = sessoes.filter((s) => s.data.startsWith(ym)).sort((a, b) => a.data.localeCompare(b.data));

  const totais = ORDEM.map((m) => ({ mod: m, n: doMes.filter((s) => s.mod === m).length })).filter((t) => t.n);
  const kg = doMes.filter((s) => s.mod === "musc").reduce((t, s) => t + volume(s), 0);
  const m = doMes.reduce((t, s) => t + metros(s), 0);
  const min = doMes.filter((s) => s.mod === "pilates").reduce((t, s) => t + (Number(s.duracaoMin) || 0), 0);

  const linhas = doMes.map((s) => {
    let detalhe = "";
    if (s.mod === "musc") {
      detalhe = (s.itens || [])
        .map((i) => `${nome(i.exId)}: ${(i.series || []).map((r) => `${numBR(r.carga)}×${r.reps}`).join(", ")}`)
        .join(" · ");
    } else if (s.mod === "natacao") {
      detalhe = (s.itens || []).map((i) => `${nome(i.exId)} ${numBR(i.metros)} m em ${i.tempoMin} min`).join(" · ");
    } else {
      detalhe = s.obs || "";
    }
    return { data: s.data, nome: s.nome, resumo: resumo(s), detalhe, mod: s.mod };
  });

  // Uma seção por exercício de musculação, com a carga máxima de cada dia.
  const porExercicio = new Map();
  for (const s of doMes.filter((x) => x.mod === "musc")) {
    for (const it of s.itens || []) {
      if (!(it.series || []).length) continue;
      const melhor = it.series.reduce((a, r) => (Number(r.carga) > Number(a.carga) ? r : a), it.series[0]);
      if (!porExercicio.has(it.exId)) porExercicio.set(it.exId, { nome: nome(it.exId), pontos: [] });
      porExercicio.get(it.exId).pontos.push({ data: s.data, carga: Number(melhor.carga) || 0, reps: Number(melhor.reps) || 0 });
    }
  }
  const evolucao = [...porExercicio.values()]
    .map((e) => {
      const c = e.pontos.map((p) => p.carga);
      return { ...e, variacao: c.length > 1 ? c[c.length - 1] - c[0] : 0 };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return { ym, mes: mesNome(ym), ano: ym.slice(0, 4), totais, kg, metros: m, minutos: min, linhas, evolucao };
}

// ------------------------------------------------------------------- PDF

const N = numBR;

/**
 * Desenha o relatório do mês. Recebe a classe jsPDF já carregada, para que
 * a geração seja síncrona e o compartilhamento não perca o toque do usuário.
 */
export function gerarPDF(jsPDF, dados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 18; // margem esquerda
  const DIR = 192; // limite direito
  const FIM = 280; // onde a página acaba
  let y = 24;

  const tinta = [43, 42, 38];
  const cinza = [122, 116, 104];

  const pagina = (precisa = 8) => {
    if (y + precisa <= FIM) return;
    doc.addPage();
    y = 24;
  };
  const regua = (cor = [216, 210, 196]) => {
    doc.setDrawColor(...cor);
    doc.setLineWidth(0.2);
    doc.line(L, y, DIR, y);
    y += 5;
  };
  const titulo = (t) => {
    pagina(16);
    y += 5;
    doc.setFont("times", "italic").setFontSize(10).setTextColor(...cinza);
    doc.text(t, L, y);
    y += 2;
    regua(tinta);
  };
  /** Escreve quebrando em várias linhas, respeitando o fim da página. */
  const paragrafo = (t, { tamanho = 10, cor = tinta, estilo = "normal", recuo = 0, alturaLinha = 4.6 } = {}) => {
    doc.setFont("times", estilo).setFontSize(tamanho).setTextColor(...cor);
    for (const linha of doc.splitTextToSize(t, DIR - L - recuo)) {
      pagina(alturaLinha);
      doc.text(linha, L + recuo, y);
      y += alturaLinha;
    }
  };

  // cabeçalho
  doc.setFont("times", "normal").setFontSize(22).setTextColor(...tinta);
  doc.text("Diário de treino", L, y);
  y += 7;
  doc.setFont("times", "italic").setFontSize(11).setTextColor(...cinza);
  doc.text(`${dados.mes} de ${dados.ano}`, L, y);
  y += 6;
  regua(tinta);

  // totais
  const cabecalho = dados.totais.map((t) => `${t.n} ${MOD[t.mod].nome.toLowerCase()}`).join(" · ");
  if (cabecalho) paragrafo(cabecalho, { tamanho: 11 });
  const medidas = [
    dados.kg ? `${N(dados.kg)} kg levantados` : null,
    dados.metros ? `${N(dados.metros)} m nadados` : null,
    dados.minutos ? `${N(dados.minutos)} min de pilates` : null,
  ].filter(Boolean);
  if (medidas.length) paragrafo(medidas.join(" · "), { tamanho: 10, cor: cinza, estilo: "italic" });

  // uma linha por treino
  titulo("Treinos do mês");
  if (!dados.linhas.length) {
    paragrafo("Nenhum treino registrado neste mês.", { estilo: "italic", cor: cinza });
  }
  for (const l of dados.linhas) {
    pagina(12);
    doc.setFont("times", "normal").setFontSize(11).setTextColor(...tinta);
    doc.text(`${fmt(l.data)}  ${l.nome}`, L, y);
    doc.text(l.resumo, DIR, y, { align: "right" });
    y += 4.8;
    if (l.detalhe) paragrafo(l.detalhe, { tamanho: 9.5, cor: cinza, recuo: 12, alturaLinha: 4.2 });
    y += 2.4;
    regua([234, 229, 217]);
  }

  // evolução de carga, exercício por exercício
  if (dados.evolucao.length) {
    titulo("Evolução de carga");
    for (const e of dados.evolucao) {
      pagina(12);
      doc.setFont("times", "normal").setFontSize(11).setTextColor(...tinta);
      doc.text(e.nome, L, y);
      if (e.variacao) {
        doc.setFont("times", "italic").setFontSize(9.5).setTextColor(...cinza);
        doc.text(`${e.variacao > 0 ? "+" : ""}${N(e.variacao)} kg no mês`, DIR, y, { align: "right" });
      }
      y += 4.8;
      paragrafo(e.pontos.map((p) => `${fmt(p.data)}  ${N(p.carga)} kg × ${p.reps}`).join("      "), {
        tamanho: 9.5,
        cor: cinza,
        recuo: 12,
        alturaLinha: 4.2,
      });
      y += 2.4;
      regua([234, 229, 217]);
    }
  }

  return doc.output("blob");
}

// --------------------------------------------------------------- planilha

const celula = (v) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const decimal = (v) => String(v ?? "").replace(".", ",");

/** Uma linha por série, no formato que o Excel e o Numbers em português abrem direto. */
export function gerarCSV(sessoes, exercicios) {
  const ex = (id) => exercicios.find((e) => e.id === id);
  const colunas = ["data", "modalidade", "treino", "exercicio", "grupo", "serie", "carga_kg", "reps", "metros", "minutos", "observacoes"];
  const linhas = [colunas];

  for (const s of [...sessoes].sort((a, b) => a.data.localeCompare(b.data) || (a.id - b.id))) {
    const base = [s.data, MOD[s.mod].nome, s.nome];
    if (s.mod === "musc") {
      for (const it of s.itens || []) {
        const e = ex(it.exId);
        (it.series || []).forEach((r, k) =>
          linhas.push([...base, e?.nome || "", e?.cat || "", k + 1, decimal(r.carga), r.reps, "", "", s.obs || ""])
        );
      }
    } else if (s.mod === "natacao") {
      for (const it of s.itens || []) {
        const e = ex(it.exId);
        linhas.push([...base, e?.nome || "", e?.cat || "", "", "", "", it.metros, it.tempoMin, s.obs || ""]);
      }
    } else {
      linhas.push([...base, "", "", "", "", "", "", s.duracaoMin, s.obs || ""]);
    }
  }
  // BOM para os acentos abrirem certo no Excel
  return "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
}

// ----------------------------------------------------------------- backup

export const VERSAO_BACKUP = 1;

/**
 * Monta o backup a partir do que a tela já tem em mãos — de propósito sem `await`:
 * no iPhone, o share sheet só abre se for chamado dentro do mesmo toque.
 */
export function montarBackup({ exercicios, treinos, sessoes, ajustes }) {
  return {
    app: "diario-de-treino",
    versao: VERSAO_BACKUP,
    em: new Date().toISOString(),
    exercicios,
    treinos,
    sessoes,
    ajustes: ajustes || [],
  };
}

/** Confere se o arquivo escolhido é mesmo um backup deste app. */
export function conferirBackup(dados) {
  if (!dados || typeof dados !== "object") return "Arquivo ilegível.";
  if (dados.app !== "diario-de-treino") return "Este arquivo não é um backup do Diário de treino.";
  for (const t of ["exercicios", "treinos", "sessoes"]) {
    if (!Array.isArray(dados[t])) return `Falta a lista de ${t} no arquivo.`;
  }
  if (dados.versao > VERSAO_BACKUP) return "Este backup veio de uma versão mais nova do app.";
  return null;
}

/** Troca todo o conteúdo do banco pelo do backup, de uma vez só. */
export async function restaurarBackup(db, dados) {
  const erro = conferirBackup(dados);
  if (erro) throw new Error(erro);
  await db.transaction("rw", db.exercicios, db.treinos, db.sessoes, db.ajustes, async () => {
    await Promise.all([db.exercicios.clear(), db.treinos.clear(), db.sessoes.clear(), db.ajustes.clear()]);
    await db.exercicios.bulkAdd(dados.exercicios);
    await db.treinos.bulkAdd(dados.treinos);
    await db.sessoes.bulkAdd(dados.sessoes);
    if (Array.isArray(dados.ajustes)) await db.ajustes.bulkAdd(dados.ajustes);
  });
  return { exercicios: dados.exercicios.length, treinos: dados.treinos.length, sessoes: dados.sessoes.length };
}

// ------------------------------------------------- entregar o arquivo

/**
 * No iPhone o caminho é o share sheet: dá para salvar nos Arquivos, mandar por e-mail
 * ou abrir no Numbers. Onde ele não existe, cai no download comum.
 */
export async function entregar(arquivo) {
  const dados = { files: [arquivo], title: arquivo.name };
  if (navigator.canShare?.(dados)) {
    try {
      await navigator.share(dados);
      return "compartilhado";
    } catch (e) {
      if (e?.name === "AbortError") return "cancelado";
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement("a");
  a.href = url;
  a.download = arquivo.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "baixado";
}

export const nomeDeArquivo = (base, ext) => `diario-de-treino-${base}.${ext}`;
