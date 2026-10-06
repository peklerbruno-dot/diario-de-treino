import { describe, expect, it } from "vitest";
import { CATEGORIAS_PADRAO } from "./categorias";
import { categoriaDaLoja, chaveDaLoja, type MemoriaDaNota } from "./categoria-da-loja";

const h = (nota: string | null, categoria: string | null, tipo: MemoriaDaNota["tipo"] = "DIARIO") => ({
  nota,
  categoria,
  tipo,
});

describe("chaveDaLoja", () => {
  it("ignora maiúscula, acento, ponto e espaço", () => {
    expect(chaveDaLoja("B. B. J. Restaurante")).toBe("bbjrestaurante");
    expect(chaveDaLoja("UBER *TRIP")).toBe("ubertrip");
    expect(chaveDaLoja("Padaria São João")).toBe("padariasaojoao");
  });
});

describe("categoriaDaLoja", () => {
  it("repete a categoria que a loja já teve", () => {
    expect(categoriaDaLoja("Uber", "DIARIO", [h("Uber", "transporte")], CATEGORIAS_PADRAO)).toBe(
      "transporte",
    );
  });

  it("acha a loja mesmo com grafia diferente", () => {
    const hist = [h("B. B. J. Restaurante", "comida")];
    expect(categoriaDaLoja("BBJ RESTAURANTE", "DIARIO", hist, CATEGORIAS_PADRAO)).toBe("comida");
  });

  it("loja nova fica sem categoria", () => {
    expect(categoriaDaLoja("Loja Nova", "DIARIO", [h("Uber", "transporte")], CATEGORIAS_PADRAO)).toBeNull();
  });

  it("sem nota não adivinha nada", () => {
    expect(categoriaDaLoja(null, "DIARIO", [h(null, "comida")], CATEGORIAS_PADRAO)).toBeNull();
    expect(categoriaDaLoja("  ", "DIARIO", [h("Uber", "transporte")], CATEGORIAS_PADRAO)).toBeNull();
  });

  it("vale o tipo: um 'Pix' de entrada não empresta categoria a um gasto", () => {
    const hist = [h("Pix", "reembolso", "ENTRADA")];
    expect(categoriaDaLoja("Pix", "DIARIO", hist, CATEGORIAS_PADRAO)).toBeNull();
    expect(categoriaDaLoja("Pix", "ENTRADA", hist, CATEGORIAS_PADRAO)).toBe("reembolso");
  });

  it("ignora lançamentos sem categoria", () => {
    expect(categoriaDaLoja("Uber", "DIARIO", [h("Uber", null)], CATEGORIAS_PADRAO)).toBeNull();
  });

  it("ignora categoria que foi apagada da lista", () => {
    const hist = [h("Uber", "categoria-apagada")];
    expect(categoriaDaLoja("Uber", "DIARIO", hist, CATEGORIAS_PADRAO)).toBeNull();
  });

  it("vence a que mais se repete", () => {
    const hist = [h("Uber", "lazer"), h("Uber", "transporte"), h("Uber", "transporte")];
    expect(categoriaDaLoja("Uber", "DIARIO", hist, CATEGORIAS_PADRAO)).toBe("transporte");
  });

  it("no empate vence a mais recente (primeira do histórico)", () => {
    const hist = [h("Uber", "lazer"), h("Uber", "transporte")];
    expect(categoriaDaLoja("Uber", "DIARIO", hist, CATEGORIAS_PADRAO)).toBe("lazer");
  });
});
