import { describe, expect, it } from "vitest";
import { codigoPix, crc16, normalizarChave } from "./pix";
import { acompanharOrcamento, lerOrcamento, ritmo } from "./orcamento";

describe("Pix copia e cola", () => {
  it("bate o CRC do exemplo do manual do Banco Central", () => {
    const corpo =
      "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304";
    expect(crc16(corpo)).toBe("1D3D");
  });
  it("monta o código com valor", () => {
    const c = codigoPix({ chave: "ana@exemplo.com", nome: "Ana Luíza", centavos: 17400 })!;
    expect(c).toContain("0014br.gov.bcb.pix0115ana@exemplo.com");
    expect(c).toContain("5406174.00");
    expect(c).toContain("5909ANA LUIZA");
    expect(c.slice(-4)).toBe(crc16(c.slice(0, -4)));
  });
  it("normaliza as chaves", () => {
    expect(normalizarChave("(11) 98765-4321")).toEqual({ chave: "+5511987654321", tipo: "telefone" });
    expect(normalizarChave("529.982.247-25")).toEqual({ chave: "52998224725", tipo: "cpf" });
    expect(normalizarChave("52998224725")).toEqual({ chave: "52998224725", tipo: "cpf" });
    expect(normalizarChave("11987654321")?.tipo).toBe("telefone");
    expect(normalizarChave("Ana@Exemplo.com")?.chave).toBe("ana@exemplo.com");
    expect(normalizarChave("abc")).toBeNull();
  });
});

describe("orçamento", () => {
  it("lê só números positivos", () => {
    expect(lerOrcamento({ total: 100, porPessoa: -1, categorias: { comida: 50, bar: "x" } })).toEqual({
      total: 100,
      porPessoa: undefined,
      categorias: { comida: 50 },
    });
  });
  it("acende o alerta em 80% e estoura acima de 100%", () => {
    const r = acompanharOrcamento(
      { total: 1000, porPessoa: 300, categorias: { comida: 500 } },
      { total: 850, porCategoria: new Map([["comida", 600]]), consumoPorPessoa: new Map([["a", 100], ["b", 310]]) },
    );
    expect(r.total?.estado).toBe("atencao");
    expect(r.categorias[0].estado).toBe("estourou");
    expect(r.pessoas.map((p) => p.estado)).toEqual(["ok", "estourou"]);
  });
  it("projeta pelo ritmo", () => {
    expect(ritmo(3000, 3, 10)).toEqual({ porDia: 1000, projecao: 10000 });
    expect(ritmo(3000, 0, 10)).toBeNull();
  });
});
