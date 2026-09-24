import { describe, expect, it } from "vitest";
import {
  descreverRepeticao,
  diasDoMes,
  escreverRepeticao,
  lerRepeticao,
  type Repeticao,
} from "./repeticao";

const QUA = 3;
const SEX = 5;

describe("ler e escrever a regra", () => {
  const casos: Repeticao[] = [
    { tipo: "TODO_DIA" },
    { tipo: "DIA_DO_MES", dia: 5 },
    { tipo: "DIA_DA_SEMANA", ordem: 1, diaDaSemana: QUA },
    { tipo: "DIA_DA_SEMANA", ordem: -1, diaDaSemana: SEX },
    { tipo: "DIA_UTIL", qual: "ultimo" },
  ];

  it("vai e volta sem perder nada", () => {
    for (const r of casos) {
      expect(lerRepeticao({ dia: 0, repeticao: escreverRepeticao(r) })).toEqual(r);
    }
  });

  /** Os fixos cadastrados antes de existir regra não podem parar de funcionar. */
  it("sem regra escrita, o campo dia continua mandando", () => {
    expect(lerRepeticao({ dia: 10 })).toEqual({ tipo: "DIA_DO_MES", dia: 10 });
    expect(lerRepeticao({ dia: 0 })).toEqual({ tipo: "TODO_DIA" });
    expect(lerRepeticao({ dia: 7, repeticao: null })).toEqual({ tipo: "DIA_DO_MES", dia: 7 });
  });

  /**
   * Um texto torto tem de cair no campo `dia`, e não sumir: um fixo que some
   * da previsão é pior do que um caindo no dia errado, que se vê e se conserta.
   */
  it("regra que não dá para entender recua para o campo dia", () => {
    expect(lerRepeticao({ dia: 9, repeticao: "semana:99:3" })).toEqual({
      tipo: "DIA_DO_MES",
      dia: 9,
    });
    expect(lerRepeticao({ dia: 9, repeticao: "coisa nenhuma" })).toEqual({
      tipo: "DIA_DO_MES",
      dia: 9,
    });
    expect(lerRepeticao({ dia: 0, repeticao: "util:terça" })).toEqual({ tipo: "TODO_DIA" });
  });
});

describe("em que dias a regra cai", () => {
  it("todo dia é todo dia, e fevereiro tem os dias de fevereiro", () => {
    expect(diasDoMes({ tipo: "TODO_DIA" }, 2027, 2)).toHaveLength(28);
    expect(diasDoMes({ tipo: "TODO_DIA" }, 2028, 2)).toHaveLength(29);
  });

  it("dia do mês que não existe cai no último, como na planilha", () => {
    expect(diasDoMes({ tipo: "DIA_DO_MES", dia: 31 }, 2026, 11)).toEqual([30]);
    expect(diasDoMes({ tipo: "DIA_DO_MES", dia: 31 }, 2027, 2)).toEqual([28]);
  });

  /** Setembro de 2026 começa numa terça: as quartas são 2, 9, 16, 23 e 30. */
  it("a primeira quarta-feira de setembro de 2026 é dia 2", () => {
    expect(diasDoMes({ tipo: "DIA_DA_SEMANA", ordem: 1, diaDaSemana: QUA }, 2026, 9)).toEqual([2]);
    expect(diasDoMes({ tipo: "DIA_DA_SEMANA", ordem: 2, diaDaSemana: QUA }, 2026, 9)).toEqual([9]);
    expect(diasDoMes({ tipo: "DIA_DA_SEMANA", ordem: -1, diaDaSemana: QUA }, 2026, 9)).toEqual([
      30,
    ]);
  });

  it("pedir a quinta quarta de um mês que só tem quatro não inventa uma", () => {
    // Outubro de 2026 tem quartas em 7, 14, 21 e 28.
    expect(diasDoMes({ tipo: "DIA_DA_SEMANA", ordem: 4, diaDaSemana: QUA }, 2026, 10)).toEqual([
      28,
    ]);
    expect(diasDoMes({ tipo: "DIA_DA_SEMANA", ordem: -1, diaDaSemana: QUA }, 2026, 10)).toEqual([
      28,
    ]);
  });

  it("dia útil pula o fim de semana nas duas pontas", () => {
    // 1º de novembro de 2026 é domingo; 30 é segunda.
    expect(diasDoMes({ tipo: "DIA_UTIL", qual: "primeiro" }, 2026, 11)).toEqual([2]);
    expect(diasDoMes({ tipo: "DIA_UTIL", qual: "ultimo" }, 2026, 11)).toEqual([30]);
    // Maio de 2027 termina numa segunda e começa num sábado.
    expect(diasDoMes({ tipo: "DIA_UTIL", qual: "primeiro" }, 2027, 5)).toEqual([3]);
    // Janeiro de 2027 termina num domingo: o último útil é sexta, dia 29.
    expect(diasDoMes({ tipo: "DIA_UTIL", qual: "ultimo" }, 2027, 1)).toEqual([29]);
  });

  it("a regra sempre devolve dias que existem no mês", () => {
    for (let mes = 1; mes <= 12; mes++) {
      for (const r of [
        { tipo: "DIA_DO_MES", dia: 31 } as const,
        { tipo: "DIA_DA_SEMANA", ordem: -1, diaDaSemana: 0 } as const,
        { tipo: "DIA_UTIL", qual: "ultimo" } as const,
      ]) {
        for (const dia of diasDoMes(r, 2027, mes)) {
          expect(dia).toBeGreaterThanOrEqual(1);
          expect(dia).toBeLessThanOrEqual(31);
        }
      }
    }
  });
});

describe("como a regra se lê na tela", () => {
  it("em português, do jeito que se fala", () => {
    expect(descreverRepeticao({ tipo: "TODO_DIA" })).toBe("todo dia");
    expect(descreverRepeticao({ tipo: "DIA_DO_MES", dia: 5 })).toBe("dia 5");
    expect(descreverRepeticao({ tipo: "DIA_DA_SEMANA", ordem: 1, diaDaSemana: QUA })).toBe(
      "primeira quarta",
    );
    expect(descreverRepeticao({ tipo: "DIA_DA_SEMANA", ordem: -1, diaDaSemana: SEX })).toBe(
      "última sexta",
    );
    expect(descreverRepeticao({ tipo: "DIA_UTIL", qual: "ultimo" })).toBe("último dia útil");
  });
});
