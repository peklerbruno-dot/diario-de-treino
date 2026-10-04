import { describe, expect, it } from "vitest";
import { gerarCodigo, normalizarCodigo, novoIdentificador, QUANTAS_PALAVRAS } from "./codigos";

describe("o código de acesso gerado", () => {
  it("tem três palavras e quatro algarismos", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigo()).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{4}$/);
  });

  it("a lista de palavras é grande o bastante (≥ 256)", () => {
    expect(QUANTAS_PALAVRAS).toBeGreaterThanOrEqual(256);
  });

  it("não repete em mil tentativas", () => {
    const vistos = new Set(Array.from({ length: 1000 }, gerarCodigo));
    expect(vistos.size).toBe(1000);
  });
});

describe("a comparação do código", () => {
  it("maiúscula, espaço, hífen e acento não importam", () => {
    const certo = normalizarCodigo("pera-azul-trem-4821");
    expect(normalizarCodigo("Pera azul trem 4821")).toBe(certo);
    expect(normalizarCodigo(" PERA-AZUL-TREM-4821 ")).toBe(certo);
    expect(normalizarCodigo("pêra azul trem 4821")).toBe(certo);
  });
});

describe("o identificador", () => {
  it("não tem ponto (o ponto separa as partes do cookie)", () => {
    for (let i = 0; i < 50; i++) expect(novoIdentificador()).toMatch(/^[A-Za-z0-9]{22}$/);
  });
});
