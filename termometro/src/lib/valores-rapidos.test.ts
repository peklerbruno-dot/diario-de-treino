import { describe, expect, it } from "vitest";
import type { Lancamento } from "./tipos";
import {
  BOTOES_NA_GRADE,
  categoriasPorUso,
  escreverPreferencias,
  lerPreferencias,
  valoresRapidos,
} from "./valores-rapidos";

let n = 0;
const gasto = (reais: number, extras: Partial<Lancamento> = {}): Lancamento => ({
  id: `g-${++n}`,
  data: "2026-09-10",
  tipo: "DIARIO",
  valorCents: reais * 100,
  ...extras,
});
const HOJE = "2026-09-30";

describe("os botões de valor", () => {
  const valores = (v: ReturnType<typeof valoresRapidos>) => v.botoes.map((b) => b.valorCents / 100);
  const seus = (v: ReturnType<typeof valoresRapidos>) =>
    v.botoes.filter((b) => b.seu).map((b) => b.valorCents / 100);
  const vezes = (reais: number, n: number, extras: Partial<Lancamento> = {}) =>
    Array.from({ length: n }, () => gasto(reais, extras));

  it("sem história, redondos de R$ 5 a R$ 100, sem descer ao de real em real", () => {
    const v = valoresRapidos([], HOJE);
    expect(valores(v)).toEqual([5, 6, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 100]);
    expect(seus(v)).toEqual([]);
    expect(v.medianaCents).toBeNull();
  });

  it("em ordem crescente, nunca mais que a grade comporta", () => {
    const historia = Array.from({ length: 40 }, (_, i) => vezes(10 + i * 3, 2)).flat();
    const v = valoresRapidos(historia, HOJE);
    const lista = valores(v);
    expect(lista).toEqual([...lista].sort((a, b) => a - b));
    expect(lista.length).toBe(BOTOES_NA_GRADE);
  });

  it("os valores que você usa entram — redondos ou quebrados — e os outros se afastam deles", () => {
    const historia = [...vezes(38, 5), ...vezes(12, 3), ...vezes(20, 6), ...vezes(27, 2)];
    const v = valoresRapidos(historia, HOJE);
    expect(seus(v)).toEqual([12, 20, 27, 38]);
    // 38 já está lá; o redondo de 40, a 5% dele, seria o mesmo botão.
    expect(valores(v)).not.toContain(40);
    expect(valores(v)).toContain(100);
  });

  it("uma vez só é acaso, não hábito", () => {
    expect(seus(valoresRapidos([gasto(38), gasto(15), gasto(15)], HOJE))).toEqual([15]);
  });

  it("quando há mais valores do que cabem, o uso recente vence o antigo", () => {
    const antigos = Array.from({ length: 25 }, (_, i) =>
      vezes(100 + i, 3, { data: "2025-11-01" }),
    ).flat();
    const novo = vezes(14, 2, { data: "2026-09-28" });
    expect(seus(valoresRapidos([...antigos, ...novo], HOJE))).toContain(14);
  });

  it("a grade vai até cobrir 95% dos gastos, nunca menos que R$ 100", () => {
    expect(valores(valoresRapidos(vezes(8, 20), HOJE)).at(-1)).toBe(100);
    const v = valoresRapidos([...vezes(40, 30), ...vezes(170, 10)], HOJE);
    expect(valores(v).at(-1)).toBe(200);
  });

  it("escondido nunca aparece; fixado aparece sempre", () => {
    const historia = [...vezes(38, 5), ...vezes(12, 3)];
    const v = valoresRapidos(historia, HOJE, { fixados: [7, 333], escondidos: [38, 5, 10] });
    expect(valores(v)).not.toContain(38);
    expect(valores(v)).not.toContain(5);
    expect(valores(v)).not.toContain(10);
    expect(seus(v)).toEqual([7, 12, 333]);
  });

  it("preferências estragadas viram nenhuma preferência", () => {
    expect(lerPreferencias("{lixo")).toEqual({ fixados: [], escondidos: [] });
    expect(lerPreferencias('{"fixados":[7,7,-1,2.5,"9"],"escondidos":null}')).toEqual({
      fixados: [7],
      escondidos: [],
    });
    const ida = { fixados: [40, 7], escondidos: [5] };
    expect(lerPreferencias(escreverPreferencias(ida))).toEqual({ fixados: [7, 40], escondidos: [5] });
  });

  it("só o gasto do dia a dia de verdade entra na conta", () => {
    const fora = [
      gasto(38, { tipo: "SAIDA" }),
      gasto(38, { previsto: true }),
      gasto(38, { apagadoEm: "2026-09-11T00:00:00.000Z" }),
      gasto(38, { data: "2025-01-01" }), // mais de um ano atrás
      gasto(38, { data: "2026-10-05" }), // futuro
    ];
    const dentro = vezes(15, 10);
    const v = valoresRapidos([...fora, ...dentro], HOJE);
    expect(v.baseadoEm).toBe(10);
    expect(v.medianaCents).toBe(1500);
    expect(seus(v)).toEqual([15]);
  });
});

describe("as categorias na confirmação de um valor", () => {
  const cats = [{ id: "mercado" }, { id: "comida" }, { id: "transporte" }, { id: "lazer" }];

  it("as mais usadas no Diário vêm primeiro; as nunca usadas, na ordem de cadastro", () => {
    const historia = [
      ...Array.from({ length: 5 }, () => gasto(20, { categoria: "transporte" })),
      ...Array.from({ length: 2 }, () => gasto(30, { categoria: "comida" })),
      gasto(50, { categoria: "lazer", tipo: "SAIDA" }), // saída não conta
      gasto(50, { categoria: "lazer", previsto: true }), // previsto não conta
    ];
    expect(categoriasPorUso(cats, historia, HOJE).map((c) => c.id)).toEqual([
      "transporte",
      "comida",
      "mercado",
      "lazer",
    ]);
  });
});
