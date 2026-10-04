import { describe, expect, it } from "vitest";
import { PADRAO, escreverAjustes, lerAjustes, litros } from "./ajustes";

describe("ajustes", () => {
  it("cai no padrão quando falta ou vem estranho", () => {
    expect(lerAjustes([])).toEqual(PADRAO);
    expect(lerAjustes([{ chave: "copo", valor: "abc" }, { chave: "aguaInicio", valor: "8h" }]).copo).toBe(PADRAO.copo);
  });

  it("volta igual ao que foi gravado", () => {
    const a = { ...PADRAO, avisarAgua: false, copo: 300, aguaInicio: "07:00" };
    expect(lerAjustes(escreverAjustes(a))).toEqual(a);
  });

  it("escreve litros como se fala", () => {
    expect(litros(250)).toBe("250 ml");
    expect(litros(2000)).toBe("2 L");
    expect(litros(1500)).toBe("1,5 L");
    expect(litros(1250)).toBe("1,25 L");
  });
});

describe("ajustes novos", () => {
  it("guardam dias de treino e textos", () => {
    const a = { ...PADRAO, treinoDias: [1, 3, 5], preTreino: "Banana com aveia", treinoAvisos: true };
    expect(lerAjustes(escreverAjustes(a))).toEqual(a);
  });

  it("limpam dias inválidos e aceitam lista vazia", () => {
    expect(lerAjustes([{ chave: "treinoDias", valor: "9,1,1,x" }]).treinoDias).toEqual([1]);
    expect(lerAjustes([{ chave: "treinoDias", valor: "" }]).treinoDias).toEqual([]);
  });
});
