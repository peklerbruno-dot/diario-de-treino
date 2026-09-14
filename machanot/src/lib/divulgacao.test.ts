import { describe, expect, it } from "vitest";
import { csvOrcamento, textoDivulgacao } from "./divulgacao";
import { calcular } from "./calculo";
import { paraInput, type EstadoMachane } from "./estado";
import { brl, paraCentavos, pct, reais } from "./dinheiro";

const machane: EstadoMachane = {
  id: "m1",
  nome: "Machané Kaitz 2026",
  tipo: "KAITZ",
  ano: 2026,
  dataInicio: null,
  dataFim: null,
  diariaCents: 17055,
  diariaTabelaCents: 18950,
  diariaObservacao: null,
  diasGrandes: 6,
  diasPequenos: 4,
  pesoOverride: 0.89,
  pesoJustificativa: "histórico",
  pesoOverridePor: null,
  pesoOverrideEm: null,
  receitaMadrichimRealCents: null,
  status: "PUBLICADA",
  duplicadaDe: null,
  categorias: [
    { id: "1", nome: "chanichim grandes", papel: "CHANICH", turma: "GRANDES", dias: 6, quantidade: 98, geraHospedagem: true, contribuicaoCents: 0, ordem: 0 },
    { id: "2", nome: "chanichim pequenos", papel: "CHANICH", turma: "PEQUENOS", dias: 4, quantidade: 17, geraHospedagem: true, contribuicaoCents: 0, ordem: 1 },
    { id: "3", nome: "madrichim grandes", papel: "MADRICH", turma: "GRANDES", dias: 6, quantidade: 35, geraHospedagem: true, contribuicaoCents: 42000, ordem: 2 },
  ],
  gastos: [
    { id: "a", descricao: "bolsa", tipo: "VALOR_FECHADO", categoria: "BOLSA", valorCents: 6000000, observacao: "fundo do movimento", revisado: true, ordem: 0 },
    { id: "b", descricao: 'transporte "ida; volta"', tipo: "VALOR_FECHADO", categoria: "TRANSPORTE", valorCents: 1880000, observacao: "orçamento de dez/25", revisado: false, ordem: 1 },
  ],
  politica: {
    id: "p1",
    metodo: "ADITIVO",
    margemBaseGrandesCents: 6400,
    margemBasePequenosCents: 20000,
    acrescimoNaoSocioCents: 20000,
    descontoSegundoFilhoCents: 13000,
    acrescimoSegundaLevaCents: 10000,
    superavitAlvoCents: 0,
    arredondamento: "NENHUM",
  },
  madrichim: [],
};

const resultado = calcular(paraInput(machane));

describe("texto para divulgação", () => {
  const texto = textoDivulgacao(machane, resultado);

  it("não repete o ano quando não há datas", () => {
    expect(texto.startsWith("Machané Kaitz 2026\n")).toBe(true);
    expect(texto).not.toContain("2026 — 2026");
  });

  it("traz as oito células e a segunda leva", () => {
    expect(texto).toContain(`R$ ${reais(resultado.precosGrandes.primeiroFilhoSocio)}`);
    expect(texto).toContain(`R$ ${reais(resultado.segundaLevaPequenos.segundoFilhoNaoSocio)}`);
    expect(texto).toContain("Segunda leva");
  });

  it("usa os dias de cada turma, sem hardcode", () => {
    const outra = textoDivulgacao({ ...machane, diasGrandes: 7, diasPequenos: 5 }, resultado);
    expect(outra).toContain("(7 dias)");
    expect(outra).toContain("(5 dias)");
  });

  it("fala de bolsas sem expor ninguém", () => {
    expect(texto).toContain("Bolsas");
  });
});

describe("CSV do orçamento", () => {
  const csv = csvOrcamento(machane, resultado);

  it("protege ponto e vírgula dentro do texto", () => {
    expect(csv).toContain('"transporte ""ida; volta"""');
  });

  it("marca em maiúsculas o gasto não revisado", () => {
    const linha = csv.split("\n").find((l) => l.startsWith('"transporte'));
    expect(linha).toContain(";NÃO;");
  });

  it("leva o total de gastos e o custo total", () => {
    expect(csv).toContain(reais(resultado.gastosFixosCents));
    expect(csv).toContain(`Custo total;${reais(resultado.custoTotalCents)}`);
  });

  it("registra os dois pesos, calculado e aplicado", () => {
    expect(csv).toContain("Peso calculado (grandes);89.6341%");
    expect(csv).toContain("Peso aplicado (grandes);89.0000%");
  });
});

describe("dinheiro", () => {
  it("formata em pt-BR", () => {
    expect(reais(244749)).toBe("2.447,49");
    expect(brl(244749)).toBe("R$ 2.447,49");
    expect(brl(-166433)).toBe("−R$ 1.664,33");
    expect(pct(0.896341, 2)).toBe("89,63%");
  });

  it("entende o que a coordenação digita", () => {
    expect(paraCentavos("2.447,49")).toBe(244749);
    expect(paraCentavos("2447,49")).toBe(244749);
    expect(paraCentavos("2447.49")).toBe(244749);
    expect(paraCentavos("R$ 170,55")).toBe(17055);
    expect(paraCentavos("1.880")).toBe(188000);
    expect(paraCentavos("170")).toBe(17000);
    expect(paraCentavos("")).toBe(null);
    expect(paraCentavos("abc")).toBe(null);
  });

  it("não perde centavo em valor negativo", () => {
    expect(paraCentavos("-130,00")).toBe(-13000);
  });
});
