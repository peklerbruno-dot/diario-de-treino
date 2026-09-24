import { describe, expect, it } from "vitest";
import type { Categoria } from "./categorias";
import { doPeriodo, totaisPorCategoria } from "./totais";
import type { Lancamento, Tipo } from "./tipos";

const categorias: Categoria[] = [
  { id: "mercado", nome: "Mercado", tipos: ["DIARIO"] },
  { id: "comida", nome: "Comida", tipos: ["DIARIO"] },
];

let n = 0;
const l = (data: string, tipo: Tipo, reais: number, categoria?: string | null): Lancamento => ({
  id: `id-${++n}`,
  data,
  tipo,
  valorCents: reais * 100,
  categoria: categoria ?? null,
});

describe("quanto foi para cada lugar", () => {
  const dados = [
    l("2026-09-01", "DIARIO", 100, "mercado"),
    l("2026-09-02", "DIARIO", 50, "comida"),
    l("2026-09-03", "DIARIO", 300, "mercado"),
    l("2026-09-04", "DIARIO", 50),
    l("2026-09-05", "SAIDA", 900, "mercado"),
  ];

  it("soma por categoria, só do tipo pedido", () => {
    const t = totaisPorCategoria(dados, categorias, "DIARIO");
    expect(t.totalCents).toBe(50000);
    expect(t.categorias.map((c) => [c.nome, c.centavos])).toEqual([
      ["Mercado", 40000],
      ["Comida", 5000],
      ["Sem categoria", 5000],
    ]);
  });

  it("ordena do maior para o menor", () => {
    const t = totaisPorCategoria(dados, categorias, "DIARIO");
    expect(t.categorias[0].nome).toBe("Mercado");
  });

  it("empate desempata pelo nome, para a lista não dançar", () => {
    const t = totaisPorCategoria(dados, categorias, "DIARIO");
    expect(t.categorias.slice(1).map((c) => c.nome)).toEqual(["Comida", "Sem categoria"]);
  });

  it("conta quantos lançamentos entraram em cada linha", () => {
    const t = totaisPorCategoria(dados, categorias, "DIARIO");
    expect(t.categorias[0].quantos).toBe(2);
  });

  it("a fatia é sobre o total do tipo, e soma 1", () => {
    const t = totaisPorCategoria(dados, categorias, "DIARIO");
    expect(t.categorias[0].parte).toBeCloseTo(0.8);
    expect(t.categorias.reduce((s, c) => s + c.parte, 0)).toBeCloseTo(1);
  });

  it("quem não tem categoria aparece, em vez de sumir da conta", () => {
    expect(totaisPorCategoria(dados, categorias, "DIARIO").categorias.map((c) => c.nome)).toContain(
      "Sem categoria",
    );
  });

  it("lançamento apagado não conta", () => {
    const comApagado = [
      ...dados,
      { ...l("2026-09-06", "DIARIO", 9999, "mercado"), apagadoEm: "x" },
    ];
    expect(totaisPorCategoria(comApagado, categorias, "DIARIO").totalCents).toBe(50000);
  });

  it("período sem nada devolve lista vazia, sem dividir por zero", () => {
    const t = totaisPorCategoria([], categorias, "DIARIO");
    expect(t).toEqual({ tipo: "DIARIO", totalCents: 0, categorias: [] });
  });
});

describe("o recorte do período", () => {
  const dados = [
    l("2026-09-01", "DIARIO", 10),
    l("2026-10-01", "DIARIO", 20),
    l("2027-09-01", "DIARIO", 30),
  ];

  it("um mês", () => {
    expect(doPeriodo(dados, 2026, 9)).toHaveLength(1);
  });

  it("o ano inteiro", () => {
    expect(doPeriodo(dados, 2026, null)).toHaveLength(2);
  });

  it("não confunde 2026 com 2027", () => {
    expect(doPeriodo(dados, 2027, null)).toHaveLength(1);
  });
});
