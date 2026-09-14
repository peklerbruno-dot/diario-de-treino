/**
 * Texto pronto para o grupo de pais e a CSV do orçamento.
 * Funções puras: os números vêm do motor, nunca digitados de novo.
 */
import type { GradePrecos, Resultado } from "@/lib/calculo";
import { valorDoGastoCents } from "@/lib/calculo";
import type { EstadoMachane } from "@/lib/estado";
import { brl, dataCurta, reais } from "@/lib/dinheiro";
import { CATEGORIAS_GASTO, PAPEIS, TIPOS_GASTO, TURMAS } from "@/lib/textos";

const LINHAS: [keyof GradePrecos, string][] = [
  ["primeiroFilhoSocio", "1º filho — sócio"],
  ["primeiroFilhoNaoSocio", "1º filho — não-sócio"],
  ["segundoFilhoSocio", "2º filho — sócio"],
  ["segundoFilhoNaoSocio", "2º filho — não-sócio"],
];

export function textoDivulgacao(e: EstadoMachane, r: Resultado): string {
  // Sem datas, o nome já traz o ano: repetir "— 2026" só polui o recado.
  const periodo =
    e.dataInicio && e.dataFim ? `${dataCurta(e.dataInicio)} a ${dataCurta(e.dataFim)}` : null;

  const bloco = (titulo: string, dias: number, grade: GradePrecos, segunda: GradePrecos) =>
    [
      `${titulo} (${dias} dias)`,
      ...LINHAS.map(([chave, rotulo]) => `  ${rotulo}: R$ ${reais(grade[chave])}`),
      `  Segunda leva (inscrição tardia): +R$ ${reais(
        segunda.primeiroFilhoSocio - grade.primeiroFilhoSocio,
      )} em todos os valores`,
      ...LINHAS.map(([chave, rotulo]) => `    ${rotulo}: R$ ${reais(segunda[chave])}`),
    ].join("\n");

  return [
    periodo ? `${e.nome} — ${periodo}` : e.nome,
    "",
    bloco(TURMAS.GRANDES.toUpperCase(), e.diasGrandes, r.precosGrandes, r.segundaLevaGrandes),
    "",
    bloco(TURMAS.PEQUENOS.toUpperCase(), e.diasPequenos, r.precosPequenos, r.segundaLevaPequenos),
    "",
    "Bolsas: o movimento reserva um fundo para quem precisa. Procure a coordenação — ninguém",
    "deixa de ir à machané por dinheiro.",
  ].join("\n");
}

const csvEscapa = (v: string | number): string => {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const linhaCsv = (celulas: (string | number)[]) => celulas.map(csvEscapa).join(";");

/**
 * Orçamento em CSV para consolidar no orçamento anual do movimento.
 * Ponto e vírgula e vírgula decimal: é o que o Excel em pt-BR abre sem reclamar.
 */
export function csvOrcamento(e: EstadoMachane, r: Resultado): string {
  const l: string[] = [];

  l.push(linhaCsv(["Machané", e.nome]));
  l.push(linhaCsv(["Ano", e.ano]));
  l.push(linhaCsv(["Diária (R$)", reais(e.diariaCents)]));
  l.push(linhaCsv(["Dias grandes", e.diasGrandes]));
  l.push(linhaCsv(["Dias pequenos", e.diasPequenos]));
  l.push("");

  l.push(linhaCsv(["PESSOAS"]));
  l.push(linhaCsv(["categoria", "papel", "turma", "dias", "quantidade", "pessoa-dia", "gera hospedagem", "contribuição (R$)"]));
  for (const c of e.categorias) {
    l.push(
      linhaCsv([
        c.nome,
        PAPEIS[c.papel],
        TURMAS[c.turma],
        c.dias,
        c.quantidade,
        c.quantidade * c.dias,
        c.geraHospedagem ? "sim" : "não",
        reais(c.contribuicaoCents),
      ]),
    );
  }
  l.push(linhaCsv(["TOTAL", "", "", "", r.totalPessoas, r.pessoaDiaTotal, "", ""]));
  l.push("");

  l.push(linhaCsv(["GASTOS FIXOS"]));
  l.push(linhaCsv(["descrição", "categoria", "tipo", "valor base (R$)", "pessoas", "dias", "total (R$)", "revisado", "observação"]));
  for (const g of e.gastos) {
    l.push(
      linhaCsv([
        g.descricao,
        CATEGORIAS_GASTO[g.categoria],
        TIPOS_GASTO[g.tipo],
        reais(g.valorCents),
        g.pessoas ?? "",
        g.dias ?? "",
        reais(valorDoGastoCents(g, e.diariaCents, r.totalPessoas)),
        g.revisado ? "sim" : "NÃO",
        g.observacao,
      ]),
    );
  }
  l.push(linhaCsv(["TOTAL", "", "", "", "", "", reais(r.gastosFixosCents), "", ""]));
  l.push("");

  l.push(linhaCsv(["RESUMO"]));
  const resumo: [string, number][] = [
    ["Hospedagem", r.hospedagemCents],
    ["Gastos fixos", r.gastosFixosCents],
    ["Custo total", r.custoTotalCents],
    ["Receita dos madrichim", r.receitaMadrichimCents],
    ["Subsídio à liderança", r.subsidioMadrichimCents],
    ["A ratear entre chanichim", r.aRatearCents],
    ["Custo por chanich grande", r.custoPorChanichGrandesCents],
    ["Custo por chanich pequeno", r.custoPorChanichPequenosCents],
    ["Fundo de bolsas", r.bolsaCents],
    ["Receita se todos 1º filho sócio", r.receitaSeTodosPrimeiroFilhoSocioCents],
    ["Superávit projetado", r.superavitProjetadoCents],
  ];
  for (const [rotulo, valor] of resumo) l.push(linhaCsv([rotulo, reais(valor)]));
  l.push(linhaCsv(["Peso calculado (grandes)", `${(r.pesoCalculado * 100).toFixed(4)}%`]));
  l.push(linhaCsv(["Peso aplicado (grandes)", `${(r.pesoAplicado * 100).toFixed(4)}%`]));
  l.push("");

  l.push(linhaCsv(["GRADE DE PREÇOS (R$)"]));
  l.push(linhaCsv(["linha", "grandes", "grandes 2ª leva", "pequenos", "pequenos 2ª leva"]));
  for (const [chave, rotulo] of LINHAS) {
    l.push(
      linhaCsv([
        rotulo,
        reais(r.precosGrandes[chave]),
        reais(r.segundaLevaGrandes[chave]),
        reais(r.precosPequenos[chave]),
        reais(r.segundaLevaPequenos[chave]),
      ]),
    );
  }

  if (r.avisos.length > 0) {
    l.push("");
    l.push(linhaCsv(["AVISOS"]));
    for (const a of r.avisos) l.push(linhaCsv([a]));
  }

  return l.join("\n");
}

/** Linhas da grade, do jeito que as telas e o PDF mostram. */
export const linhasDaGrade = LINHAS;

export function resumoTransparencia(r: Resultado): string[] {
  return [
    `Subsídio à liderança: ${r.quantidadeSubsidiados} madrichim e peilim custam ${brl(
      r.custoDosNaoChanichimCents,
    )} em hospedagem e pagam ${brl(r.receitaMadrichimCents)}.`,
    `Fundo de bolsas: ${brl(r.bolsaCents)}, ou ${brl(
      r.impactoBolsaPorChanichGrandeCents,
    )} no preço de cada chanich grande.`,
    `Rateio aplicado: ${(r.pesoAplicado * 100).toFixed(1)}% / ${((1 - r.pesoAplicado) * 100).toFixed(1)}%.`,
  ];
}
