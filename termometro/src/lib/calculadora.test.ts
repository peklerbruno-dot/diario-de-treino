import { describe, expect, it } from "vitest";
import { avaliar, paraOVisor, teclar } from "./calculadora";

const parcelas = (t: string) => avaliar(t)?.parcelas ?? null;

describe("o + separa em vários lançamentos", () => {
  it("é a soma que a planilha guardava dentro da célula", () => {
    expect(parcelas("195+15+83")).toEqual([19500, 1500, 8300]);
  });

  it("um valor sozinho é um lançamento só", () => {
    expect(parcelas("38,50")).toEqual([3850]);
  });

  it("aceita a vírgula dentro da soma", () => {
    expect(parcelas("19,12+45,8")).toEqual([1912, 4580]);
  });

  it("aceita o ponto de milhar", () => {
    expect(parcelas("1.234,56")).toEqual([123456]);
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

  it("só deixa uma vírgula por número", () => {
    expect(teclar("12,5", ",")).toBe("12,5");
    expect(teclar("12,5+3", ",")).toBe("12,5+3,");
  });

  it("vírgula sozinha vira zero vírgula", () => {
    expect(teclar("", ",")).toBe("0,");
    expect(teclar("10+", ",")).toBe("10+0,");
  });
});

describe("o visor", () => {
  it("desenha os sinais como a gente escreve à mão", () => {
    expect(paraOVisor("195+3*50-10/2")).toBe("195 + 3 × 50 − 10 ÷ 2");
  });
});
