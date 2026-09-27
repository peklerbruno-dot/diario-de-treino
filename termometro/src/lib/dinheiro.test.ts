import { describe, expect, it } from "vitest";
import { avaliar } from "./calculadora";
import {
  aoReal,
  comCifrao,
  emReais,
  paraCentavos,
  paraOTeclado,
  parcelas,
  TETO_CENTS,
} from "./dinheiro";

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

describe("o valor que o teclado recebe pronto", () => {
  it("é sem vírgula, porque o teclado não tem vírgula", () => {
    expect(paraOTeclado(6600)).toBe("66");
    expect(paraOTeclado(123400)).toBe("1234");
  });

  it("sem valor nenhum, o campo fica em branco", () => {
    expect(paraOTeclado(null)).toBe("");
    expect(paraOTeclado(undefined)).toBe("");
    expect(paraOTeclado(Number.NaN)).toBe("");
  });

  /**
   * O teste que faltava.
   *
   * Editar um lançamento de R$ 66 preenchia o campo com "66,00", a calculadora
   * lia 6.600 e salvar gravava cem vezes o valor. A ida e a volta têm de
   * fechar: o que sai para o campo, lido de volta, é o mesmo dinheiro.
   */
  it("o que vai para o campo volta valendo o mesmo", () => {
    for (const cents of [100, 6600, 2700, 123400, 1400, 999900]) {
      expect(avaliar(paraOTeclado(cents))?.totalCents).toBe(cents);
    }
  });
});

describe("os sinais que o campo simples não faz", () => {
  it("recusa a soma em vez de colar os dígitos", () => {
    // "1000+500" virava R$ 1.000.500 no saldo de abertura. Recusar avisa.
    expect(paraCentavos("1000+500")).toBeNull();
    expect(paraCentavos("50-30")).toBeNull();
  });

  it("o negativo continua valendo, só no começo", () => {
    expect(paraCentavos("-35")).toBe(-3500);
    expect(paraCentavos("35-")).toBeNull();
  });
});

describe("o teto de valor", () => {
  it("recusa o dedo que repetiu dígitos", () => {
    // R$ 38.003.800 estourava o inteiro do banco e travava a sincronização.
    expect(paraCentavos("38003800")).toBeNull();
    expect(avaliar("38003800")).toBeNull();
  });

  it("aceita até o teto, recusa acima", () => {
    expect(paraCentavos("10000000")).toBe(TETO_CENTS);
    expect(paraCentavos("10000001")).toBeNull();
  });
});

describe("o arredondamento no lado negativo", () => {
  it("o meio vai para longe do zero dos dois lados", () => {
    expect(aoReal(150)).toBe(200);
    expect(aoReal(-150)).toBe(-200);
  });
});

describe("a divisão no teclado", () => {
  it("cada parcela sai redonda: o visor e o banco veem o mesmo número", () => {
    // "100/3" mostrava R$ 100 na prévia e salvava R$ 99.
    expect(avaliar("100/3")).toEqual({ parcelas: [3300], totalCents: 3300 });
    expect(avaliar("100/3+100/3+100/3")).toEqual({
      parcelas: [3300, 3300, 3300],
      totalCents: 9900,
    });
  });

  it("uma conta que dá menos de meio real não vira lançamento", () => {
    expect(avaliar("1/3")).toBeNull();
  });
});
