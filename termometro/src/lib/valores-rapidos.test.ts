import { describe, expect, it } from "vitest";
import type { Lancamento } from "./tipos";
import { valoresRapidos } from "./valores-rapidos";

let n = 0;
const gasto = (reais: number, extras: Partial<Lancamento> = {}): Lancamento => ({
  id: `g-${++n}`,
  data: "2026-09-10",
  tipo: "DIARIO",
  valorCents: reais * 100,
  ...extras,
});
const HOJE = "2026-09-30";
const emReais = (cents: number[]) => cents.map((c) => c / 100);

describe("os botões de valor", () => {
  it("sem história, a escada de 5 em 5 até 50 e de 10 em 10 até 100", () => {
    const v = valoresRapidos([], HOJE);
    expect(emReais(v.escada)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100]);
    expect(v.deSempre).toEqual([]);
    expect(v.medianaCents).toBeNull();
  });

  it("com gastos pequenos, a escada não encolhe abaixo de R$ 100", () => {
    const v = valoresRapidos(
      Array.from({ length: 20 }, () => gasto(8)),
      HOJE,
    );
    expect(emReais(v.escada).at(-1)).toBe(100);
  });

  it("com gastos maiores, a escada sobe até cobrir 95% deles", () => {
    const historia = [
      ...Array.from({ length: 30 }, () => gasto(40)),
      ...Array.from({ length: 10 }, () => gasto(170)),
    ];
    const v = valoresRapidos(historia, HOJE);
    // 95% dos gastos ficam até R$ 170 → a escada vai até o degrau de R$ 180.
    expect(emReais(v.escada).at(-1)).toBe(180);
  });

  it("os quebrados que se repetem viram 'de sempre'; os redondos já estão na escada", () => {
    const historia = [
      ...Array.from({ length: 5 }, () => gasto(38)),
      ...Array.from({ length: 3 }, () => gasto(12)),
      ...Array.from({ length: 2 }, () => gasto(27)), // duas vezes é coincidência
      ...Array.from({ length: 6 }, () => gasto(20)), // redondo: já está na escada
    ];
    const v = valoresRapidos(historia, HOJE);
    expect(emReais(v.deSempre)).toEqual([12, 38]);
  });

  it("só o gasto do dia a dia de verdade entra na conta", () => {
    const fora = [
      gasto(38, { tipo: "SAIDA" }),
      gasto(38, { previsto: true }),
      gasto(38, { apagadoEm: "2026-09-11T00:00:00.000Z" }),
      gasto(38, { data: "2025-01-01" }), // mais de um ano atrás
      gasto(38, { data: "2026-10-05" }), // futuro
    ];
    const dentro = Array.from({ length: 10 }, () => gasto(15));
    const v = valoresRapidos([...fora, ...dentro], HOJE);
    expect(v.baseadoEm).toBe(10);
    expect(v.medianaCents).toBe(1500);
  });
});
