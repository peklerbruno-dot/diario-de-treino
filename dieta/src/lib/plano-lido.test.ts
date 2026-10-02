import { describe, expect, it } from "vitest";
import { ErroDeLeitura, interpretarResposta } from "./plano-lido";

describe("interpretarResposta", () => {
  it("arruma horário, ordena e limpa o que veio do Gemini", () => {
    const p = interpretarResposta(
      "```json\n" +
        JSON.stringify({
          nome: "Plano de outubro",
          orientacoes: "Evitar fritura",
          aguaMl: 2500,
          refeicoes: [
            { nome: "Almoço", horario: "12h30", dias: [], nota: "", opcoes: [{ titulo: "", itens: [{ texto: "Arroz", subs: ["batata"] }] }] },
            { nome: "Café", horario: "7h", dias: [0, 1, 2, 3, 4, 5, 6], nota: "", opcoes: [{ titulo: "", itens: [{ texto: "Pão", subs: [] }] }] },
            { nome: "Vazia", horario: "10:00", dias: [], nota: "", opcoes: [] },
            { nome: "Lanche", horario: "??", dias: [6, 0, 9, 6], nota: "", opcoes: [{ titulo: "", itens: [{ texto: "Fruta", subs: [] }] }] },
          ],
        }) +
        "\n```",
    );
    expect(p.nome).toBe("Plano de outubro");
    expect(p.aguaMl).toBe(2500);
    expect(p.refeicoes.map((r) => [r.nome, r.horario, r.dias])).toEqual([
      ["Café", "07:00", []],
      ["Lanche", "12:00", [0, 6]],
      ["Almoço", "12:30", []],
    ]);
    expect(p.refeicoes[2].conteudo).toEqual([{ titulo: "", itens: [{ texto: "Arroz", subs: ["batata"] }] }]);
  });

  it("ignora meta de água absurda ou ausente", () => {
    expect(interpretarResposta(JSON.stringify({ aguaMl: 0, refeicoes: [] })).aguaMl).toBeNull();
    expect(interpretarResposta(JSON.stringify({ aguaMl: 90000, refeicoes: [] })).aguaMl).toBeNull();
  });

  it("recusa o que não é JSON", () => {
    expect(() => interpretarResposta("não sei")).toThrow(ErroDeLeitura);
  });
});
