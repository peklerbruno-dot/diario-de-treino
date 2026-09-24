import { describe, expect, it } from "vitest";
import { aoReal, comCifrao, emReais, paraCentavos, parcelas } from "./dinheiro";

describe("ler um valor digitado", () => {
  it("aceita a vírgula, que é a tecla decimal do teclado em português", () => {
    expect(paraCentavos("52,5")).toBe(5250);
    expect(paraCentavos("52,50")).toBe(5250);
    expect(paraCentavos("0,99")).toBe(99);
  });

  it("aceita o ponto de quem digita em inglês", () => {
    expect(paraCentavos("52.5")).toBe(5250);
    expect(paraCentavos("1234.56")).toBe(123456);
  });

  it("entende o ponto de milhar quando sobram três casas", () => {
    expect(paraCentavos("1.234")).toBe(123400);
    expect(paraCentavos("1.234,56")).toBe(123456);
    expect(paraCentavos("12.345,67")).toBe(1234567);
  });

  it("não se perde com R$, espaço e texto em volta", () => {
    expect(paraCentavos("R$ 1.234,56")).toBe(123456);
    expect(paraCentavos("  87 reais ")).toBe(8700);
  });

  it("corta na segunda casa em vez de arredondar para cima escondido", () => {
    expect(paraCentavos("10,999")).toBe(1099);
  });

  it("devolve nada quando não há número nenhum", () => {
    expect(paraCentavos("")).toBeNull();
    expect(paraCentavos("abc")).toBeNull();
    expect(paraCentavos("R$")).toBeNull();
  });

  it("entende o valor negativo", () => {
    expect(paraCentavos("-35")).toBe(-3500);
  });
});

describe("a soma que a planilha deixou como hábito", () => {
  it("quebra 195+15+83 em três valores", () => {
    expect(parcelas("195+15+83")).toEqual([19500, 1500, 8300]);
  });

  it("aceita vírgula dentro da soma", () => {
    expect(parcelas("19,12+45,8")).toEqual([1912, 4580]);
  });

  it("um valor sozinho continua sendo uma parcela só", () => {
    expect(parcelas("60")).toEqual([6000]);
  });

  it("devolve nada quando não há número", () => {
    expect(parcelas("+++")).toBeNull();
    expect(parcelas("")).toBeNull();
  });
});

describe("mostrar dinheiro", () => {
  it("escreve em português, sempre em reais inteiros", () => {
    expect(emReais(123456)).toBe("1.235");
    expect(comCifrao(123456)).toBe("R$ 1.235");
    expect(comCifrao(-50)).toBe("-R$ 1");
    expect(comCifrao(0)).toBe("R$ 0");
  });

  it("arredonda ao real mais próximo antes de guardar", () => {
    expect(aoReal(77142)).toBe(77100);
    expect(aoReal(77150)).toBe(77200);
    expect(aoReal(-77142)).toBe(-77100);
    expect(aoReal(0)).toBe(0);
    expect(aoReal(NaN)).toBe(0);
  });

});

