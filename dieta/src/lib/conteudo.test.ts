import { describe, expect, it } from "vitest";
import { escreverTexto, lerTexto, normalizarConteudo, resumir } from "./conteudo";

describe("lerTexto", () => {
  it("lê itens soltos como uma opção sem título", () => {
    expect(lerTexto("Arroz — 4 col.\nFeijão — 1 concha")).toEqual([
      { titulo: "", itens: [{ texto: "Arroz — 4 col.", subs: [] }, { texto: "Feijão — 1 concha", subs: [] }] },
    ]);
  });

  it("junta as substituições ao item de cima", () => {
    const c = lerTexto("Pão integral — 2 fatias\nou tapioca — 3 col.\nOU: cuscuz 100 g\nOvo — 2 un.");
    expect(c[0].itens).toEqual([
      { texto: "Pão integral — 2 fatias", subs: ["tapioca — 3 col.", "cuscuz 100 g"] },
      { texto: "Ovo — 2 un.", subs: [] },
    ]);
  });

  it("abre uma opção nova a cada linha terminada em dois-pontos", () => {
    const c = lerTexto("Opção 1:\nPão\nOpção 2:\nIogurte\nFruta");
    expect(c.map((o) => o.titulo)).toEqual(["Opção 1", "Opção 2"]);
    expect(c[1].itens.map((i) => i.texto)).toEqual(["Iogurte", "Fruta"]);
  });

  it("tira marcadores de lista e ignora linhas vazias e opções vazias", () => {
    const c = lerTexto("- Banana\n\n• Aveia\n2) Mel\nOpção vazia:");
    expect(c).toEqual([
      { titulo: "", itens: [{ texto: "Banana", subs: [] }, { texto: "Aveia", subs: [] }, { texto: "Mel", subs: [] }] },
    ]);
  });

  it("não confunde palavra que começa com 'ou' com substituição", () => {
    expect(lerTexto("Ovo\nOuriço do mar")[0].itens).toHaveLength(2);
  });

  it("'ou' na primeira linha vira item, porque não há de quem ser substituição", () => {
    expect(lerTexto("ou banana")[0].itens[0].texto).toBe("ou banana");
  });
});

describe("escreverTexto", () => {
  it("é o inverso de lerTexto", () => {
    const original = "Opção 1:\nPão integral — 2 fatias\nou tapioca\nOvo\nOpção 2:\nIogurte";
    const c = lerTexto(original);
    expect(escreverTexto(c)).toBe(original);
    expect(lerTexto(escreverTexto(c))).toEqual(c);
  });

  it("não inventa título quando há uma opção só", () => {
    expect(escreverTexto(lerTexto("Arroz\nou batata"))).toBe("Arroz\nou batata");
  });
});

describe("normalizarConteudo", () => {
  it("descarta o que não tem forma de conteúdo", () => {
    expect(normalizarConteudo(null)).toEqual([]);
    expect(normalizarConteudo([{ titulo: 3, itens: [{ texto: "  Maçã  ", subs: ["pera", 7, ""] }, { texto: "" }] }])).toEqual([
      { titulo: "", itens: [{ texto: "Maçã", subs: ["pera"] }] },
    ]);
  });
});

describe("resumir", () => {
  it("mostra a primeira opção e conta as outras", () => {
    const c = lerTexto("Opção 1:\nPão\nOvo\nOpção 2:\nIogurte\nOpção 3:\nFruta");
    expect(resumir(c)).toBe("Pão · Ovo (+2 opções)");
  });

  it("corta texto comprido sem perder o sufixo", () => {
    const c = lerTexto(`${"a".repeat(300)}\nOpção 2:\nb`.replace(/^/, "Opção 1:\n"));
    const r = resumir(c, 50);
    expect(r.length).toBeLessThanOrEqual(50);
    expect(r.endsWith("… (+1 opção)")).toBe(true);
  });
});
