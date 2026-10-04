import { describe, expect, it } from "vitest";
import { lerRespostaDaFoto, normalizarAnalise, somarDia, sugestaoDeMarca } from "./analise";

const boa = {
  descricao: "Arroz, feijão e frango.",
  itens: [{ alimento: "Arroz", quantidade: "4 col." }, { alimento: "", quantidade: "x" }],
  calorias: 612.4,
  proteinas: 38,
  carboidratos: 70,
  gorduras: 14,
  noPlano: "sim",
  comentario: "Bateu com o almoço.",
};

describe("análise da foto", () => {
  it("limpa e arredonda o que veio", () => {
    const a = lerRespostaDaFoto("```json\n" + JSON.stringify(boa) + "\n```");
    expect(a?.calorias).toBe(612);
    expect(a?.itens).toEqual([{ alimento: "Arroz", quantidade: "4 col." }]);
    expect(a?.noPlano).toBe("sim");
  });

  it("não aceita número absurdo, negativo ou veredito inventado", () => {
    const a = normalizarAnalise({ ...boa, calorias: -3, gorduras: 99999, noPlano: "talvez" });
    expect(a?.calorias).toBe(0);
    expect(a?.gorduras).toBe(400);
    expect(a?.noPlano).toBe("sem-plano");
  });

  it("devolve null para resposta vazia ou quebrada", () => {
    expect(lerRespostaDaFoto("não é json")).toBeNull();
    expect(normalizarAnalise({ itens: [] })).toBeNull();
  });

  it("sugere a marca da refeição", () => {
    expect(sugestaoDeMarca(normalizarAnalise(boa))).toBe("seguiu");
    expect(sugestaoDeMarca(normalizarAnalise({ ...boa, noPlano: "parcial" }))).toBe("trocou");
    expect(sugestaoDeMarca(normalizarAnalise({ ...boa, noPlano: "sem-plano" }))).toBeNull();
  });

  it("soma o dia ignorando foto sem análise", () => {
    expect(somarDia([normalizarAnalise(boa), null, normalizarAnalise(boa)])).toEqual({
      calorias: 1224,
      proteinas: 76,
      carboidratos: 140,
      gorduras: 28,
      fotos: 2,
    });
  });
});
