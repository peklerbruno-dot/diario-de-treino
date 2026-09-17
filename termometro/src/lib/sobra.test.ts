import { describe, expect, it } from "vitest";
import { calcularAno, sobraPorDia } from "./calculo";
import type { Lancamento, Tipo } from "./tipos";

let n = 0;
const lancamento = (
  data: string,
  tipo: Tipo,
  reais: number,
  extras: Partial<Lancamento> = {},
): Lancamento => ({
  id: `id-${++n}`,
  data,
  tipo,
  valorCents: Math.round(reais * 100),
  criadoEm: "2026-01-01T00:00:00.000Z",
  atualizadoEm: "2026-01-01T00:00:00.000Z",
  ...extras,
});

const semAjuste = { saldoInicialCents: 0, rateioAptoPercent: 40 };

/**
 * Setembro de 2026, como estava no aparelho: R$ 1.377,43 no fim do dia 16 e,
 * até o dia 30, a parcela do apartamento, o reembolso, o salário, duas contas e
 * o investimento — mais os R$ 60 por dia já previstos.
 */
const setembro = () =>
  calcularAno({
    ano: 2026,
    lancamentos: [
      lancamento("2026-09-01", "ENTRADA", 1377.43, { rendaPropria: true }),
      lancamento("2026-09-19", "SAIDA", 771.42, { previsto: true }),
      lancamento("2026-09-22", "ENTRADA", 904.4, { previsto: true }),
      lancamento("2026-09-23", "ENTRADA", 11146.6, { previsto: true }),
      lancamento("2026-09-25", "SAIDA", 2261, { previsto: true }),
      lancamento("2026-09-27", "SAIDA", 2000, { previsto: true }),
      lancamento("2026-09-30", "SAIDA", 7500, { previsto: true, investimento: true }),
      ...Array.from({ length: 14 }, (_, i) =>
        lancamento(`2026-09-${17 + i}`, "DIARIO", 60, { previsto: true }),
      ),
    ],
    ajustes: semAjuste,
  });

describe("quanto ainda dá para gastar por dia", () => {
  it("reparte pelos dias que faltam o que ninguém mais reservou", () => {
    const s = sobraPorDia(setembro(), "2026-09-17")!;
    expect(s.diasRestantes).toBe(14); // do dia 17 ao 30
    expect(s.disponivelCents).toBe(89601); // 1.377,43 + 12.051,00 − 12.532,42
    expect(s.porDiaCents).toBe(6400); // R$ 64,00 por dia
  });

  it("não desconta o diário previsto: é ele que está sendo calculado", () => {
    const s = sobraPorDia(setembro(), "2026-09-17")!;
    // Gastando os R$ 60 previstos por dia, sobram os R$ 56,01 com que o mês fecha.
    expect(s.disponivelCents - 14 * 6000).toBe(5601);
  });

  it("desconta o que já foi gasto de verdade hoje", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-09-01", "ENTRADA", 1000),
        lancamento("2026-09-17", "DIARIO", 22),
        lancamento("2026-09-18", "DIARIO", 60, { previsto: true }),
      ],
      ajustes: semAjuste,
    });
    const s = sobraPorDia(ano, "2026-09-17")!;
    expect(s.gastoDeHojeCents).toBe(2200);
    expect(s.disponivelCents).toBe(100000 - 2200);
  });

  it("arredonda para baixo, porque é melhor sobrar do que faltar", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-09-01", "ENTRADA", 100)],
      ajustes: semAjuste,
    });
    const s = sobraPorDia(ano, "2026-09-28")!; // 3 dias para R$ 100
    expect(s.porDiaCents).toBe(3333);
  });

  it("fica negativo quando já se gastou além, em vez de fingir que dá", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-09-01", "ENTRADA", 100),
        lancamento("2026-09-20", "SAIDA", 400),
      ],
      ajustes: semAjuste,
    });
    expect(sobraPorDia(ano, "2026-09-29")!.porDiaCents).toBeLessThan(0);
  });

  it("no último dia do mês reparte por um dia só", () => {
    expect(sobraPorDia(setembro(), "2026-09-30")!.diasRestantes).toBe(1);
  });

  it("não inventa resposta para um dia de outro ano", () => {
    expect(sobraPorDia(setembro(), "2025-09-17")).toBeNull();
  });
});
