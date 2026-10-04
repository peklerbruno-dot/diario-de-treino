import { describe, expect, it } from "vitest";
import { chaveDoItem, lerJson, normalizarPlanejamento, normalizarTroca } from "./semana";

describe("planejamento da semana", () => {
  it("limpa e descarta o que não serve", () => {
    const p = normalizarPlanejamento(
      lerJson(
        "```json\n" +
          JSON.stringify({
            cardapio: [{ dia: "Segunda", refeicoes: [{ nome: "Almoço", prato: "Frango, arroz e brócolis" }, { nome: "", prato: "x" }] }, { dia: "Terça", refeicoes: [] }],
            preparo: ["Cozinhe o arroz", ""],
            compras: [{ secao: "", itens: [{ item: "Brócolis", quantidade: "2 maços" }, { item: "" }] }, { secao: "Vazia", itens: [] }],
            dicas: "Congele 3 marmitas.",
          }) +
          "\n```",
      ),
    );
    expect(p).toEqual({
      cardapio: [{ dia: "Segunda", refeicoes: [{ nome: "Almoço", prato: "Frango, arroz e brócolis" }] }],
      preparo: ["Cozinhe o arroz"],
      compras: [{ secao: "Outros", itens: [{ item: "Brócolis", quantidade: "2 maços" }] }],
      dicas: "Congele 3 marmitas.",
    });
  });

  it("devolve null quando não veio nada útil", () => {
    expect(normalizarPlanejamento(lerJson("quebrado"))).toBeNull();
    expect(normalizarPlanejamento({ cardapio: [], compras: [] })).toBeNull();
  });

  it("chave do item ignora maiúsculas", () => {
    expect(chaveDoItem("Hortifruti", "Brócolis")).toBe(chaveDoItem("hortifruti", "brócolis"));
  });
});

describe("posso trocar?", () => {
  it("aceita resposta boa e corrige veredito inventado", () => {
    expect(normalizarTroca({ veredito: "pode", resposta: "Pode sim.", sugestao: "" })?.veredito).toBe("pode");
    expect(normalizarTroca({ veredito: "talvez", resposta: "Depende." })?.veredito).toBe("com-ajuste");
    expect(normalizarTroca({ veredito: "pode", resposta: "" })).toBeNull();
  });
});
