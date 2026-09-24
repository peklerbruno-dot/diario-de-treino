import { describe, expect, it } from "vitest";
import { avaliar, paraOVisor, teclar } from "./calculadora";

const parcelas = (t: string) => avaliar(t)?.parcelas ?? null;

describe("o + separa em vários lançamentos", () => {
  it("é a soma que a planilha guardava dentro da célula", () => {
    expect(parcelas("195+15+83")).toEqual([19500, 1500, 8300]);
  });

  it("um valor sozinho é um lançamento só", () => {
    expect(avaliar("195")).toEqual({ parcelas: [19500], totalCents: 19500 });
  });

  it("não há vírgula para aceitar: o app só trabalha com reais inteiros", () => {
    expect(avaliar("52,5")).toEqual({ parcelas: [52500], totalCents: 52500 });
  });

  it("o ponto de milhar é só enfeite e sai da conta", () => {
    expect(avaliar("1.234")).toEqual({ parcelas: [123400], totalCents: 123400 });
  });
});

describe("× ÷ − são conta dentro de um valor só", () => {
  it.each([
    ["3*50", [15000]],
    ["100-20", [8000]],
    ["1000/4", [25000]],
    ["2*3*4", [2400]],
  ])("%s vira um lançamento", (texto, esperado) => {
    expect(parcelas(texto)).toEqual(esperado);
  });

  it("faz vezes e dividido antes da subtração, como na escola", () => {
    expect(parcelas("100-2*30")).toEqual([4000]);
    expect(parcelas("100-60/2")).toEqual([7000]);
  });

  it("mistura as duas coisas sem confundir", () => {
    expect(parcelas("195+3*50")).toEqual([19500, 15000]);
  });
});

describe("o que a conta recusa", () => {
  it.each([[""], ["+"], ["   "], ["+++"], [","]])("nada aproveitável em %s", (t) => {
    expect(avaliar(t)).toBeNull();
  });

  it("recusa resultado negativo: a coluna é que diz se entrou ou saiu", () => {
    expect(avaliar("20-100")).toBeNull();
  });

  it("recusa divisão por zero em vez de devolver infinito", () => {
    expect(avaliar("10/0")).toBeNull();
  });

  it("descarta parcela que dá zero", () => {
    expect(parcelas("50+0")).toEqual([5000]);
  });
});

describe("enquanto se digita", () => {
  it("ignora o operador que ainda está pela metade", () => {
    expect(parcelas("195+")).toEqual([19500]);
    expect(parcelas("3*")).toEqual([300]);
    expect(parcelas("12,")).toEqual([1200]);
  });

  it("o total confere com a soma das parcelas", () => {
    expect(avaliar("195+15+83")?.totalCents).toBe(29300);
  });
});

describe("as teclas", () => {
  it("apaga de trás para a frente", () => {
    expect(teclar("123", "⌫")).toBe("12");
    expect(teclar("", "⌫")).toBe("");
  });

  it("troca o operador em vez de empilhar dois", () => {
    expect(teclar("50+", "*")).toBe("50*");
  });

  it("não começa a conta por um operador", () => {
    expect(teclar("", "+")).toBe("");
  });

  it("o zero duplo é atalho para valor redondo", () => {
    expect(teclar("15", "00")).toBe("1500");
  });

  it("o zero duplo não começa um número, que daria \"00\"", () => {
    expect(teclar("", "00")).toBe("");
    expect(teclar("15+", "00")).toBe("15+");
  });
});

describe("o visor", () => {
  it("desenha os sinais como a gente escreve à mão", () => {
    expect(paraOVisor("195+3*50-10/2")).toBe("195 + 3 × 50 − 10 ÷ 2");
  });
});
