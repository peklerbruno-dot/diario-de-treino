import { describe, expect, it } from "vitest";
import { classeDoSaldo, corDoSaldo, faixaDoMes } from "./escala";

const reais = (...v: number[]) => v.map((n) => Math.round(n * 100));

describe("a faixa do mês", () => {
  it("guarda o chão e o teto dos positivos, e o pior negativo", () => {
    expect(faixaDoMes(reais(500, 900, -300, 1200))).toEqual({
      menorPositivoCents: 50000,
      maiorPositivoCents: 120000,
      piorNegativoCents: 30000,
    });
  });

  it("mês sem negativo nenhum não inventa um", () => {
    expect(faixaDoMes(reais(100, 200)).piorNegativoCents).toBe(0);
  });

  it("mês inteiro no vermelho não inventa positivo", () => {
    const f = faixaDoMes(reais(-100, -400));
    expect(f).toMatchObject({ menorPositivoCents: 0, maiorPositivoCents: 0 });
    expect(f.piorNegativoCents).toBe(40000);
  });

  it("ignora o que não é número", () => {
    expect(faixaDoMes([NaN, 10000]).maiorPositivoCents).toBe(10000);
  });
});

describe("a cor de um saldo", () => {
  /**
   * É o caso que mandou reescrever esta escala. Medindo a distância até o
   * zero, estes cinco dias ficavam todos no degrau 5 — uma coluna de uma cor
   * só, que não diz nada. Medidos contra a faixa do mês, eles se espalham.
   */
  it("espalha os degraus num mês que anda longe do zero", () => {
    const saldos = reais(47000, 48000, 49000, 50000, 51000);
    const faixa = faixaDoMes(saldos);
    const degraus = saldos.map((s) => corDoSaldo(s, faixa).degrau);
    expect(new Set(degraus).size).toBeGreaterThan(1);
    expect(degraus[0]).toBe(1);
    expect(degraus[degraus.length - 1]).toBe(5);
  });

  it("o zero manda no sinal, a faixa manda no tom", () => {
    const faixa = faixaDoMes(reais(-200, 500, 900));
    expect(corDoSaldo(reais(-200)[0], faixa).braco).toBe("faltou");
    expect(corDoSaldo(reais(500)[0], faixa).braco).toBe("sobrou");
  });

  it("o pior dia do mês é o vermelho mais forte", () => {
    const faixa = faixaDoMes(reais(-800, -100, 500));
    expect(corDoSaldo(reais(-800)[0], faixa)).toEqual({ braco: "faltou", degrau: 5 });
    expect(corDoSaldo(reais(-100)[0], faixa).degrau).toBeLessThan(5);
  });

  it("mês de um valor só fica no meio da escala, sem fingir topo nem fundo", () => {
    const faixa = faixaDoMes(reais(700, 700, 700));
    expect(corDoSaldo(reais(700)[0], faixa)).toEqual({ braco: "sobrou", degrau: 3 });
  });

  it("zero não é nem verde nem vermelho", () => {
    expect(corDoSaldo(0, faixaDoMes(reais(500)))).toEqual({ braco: "zero", degrau: 0 });
    expect(classeDoSaldo({ braco: "zero", degrau: 0 })).toBe("");
  });

  it("um negativo num mês que não tinha negativo ainda sai vermelho", () => {
    expect(corDoSaldo(-5000, faixaDoMes(reais(500, 900))).braco).toBe("faltou");
  });

  it("não quebra com número que não é número", () => {
    expect(corDoSaldo(NaN, faixaDoMes(reais(500))).braco).toBe("zero");
  });

  it("devolve a classe que o Tailwind conhece", () => {
    expect(classeDoSaldo({ braco: "sobrou", degrau: 3 })).toBe("bg-sobrou-3");
    expect(classeDoSaldo({ braco: "faltou", degrau: 5 })).toBe("bg-faltou-5");
  });
});
