import { describe, expect, it } from "vitest";
import { linhaDoPeso, resumoDaSemana, textoParaNutricionista, type DiaDoRelatorio } from "./relatorio";

const dia = (d: string, extra: Partial<DiaDoRelatorio> = {}): DiaDoRelatorio => ({
  dia: d, seguiu: 0, trocou: 0, pulou: 0, agua: 0, calorias: 0, fotos: 0, registros: [], ...extra,
});

describe("textoParaNutricionista", () => {
  it("resume adesão, água, calorias, trocas e puladas", () => {
    const t = textoParaNutricionista(
      [
        dia("2026-10-03", { seguiu: 4, pulou: 1, agua: 2000, calorias: 1800, fotos: 3, registros: [{ nome: "Lanche", horario: "16:00", estado: "pulou", nota: "" }] }),
        dia("2026-10-02", { seguiu: 3, trocou: 1, agua: 1500, registros: [{ nome: "Almoço", horario: "12:30", estado: "trocou", nota: "pizza" }] }),
        dia("2026-10-01"),
      ],
      2000,
      "Plano de outubro",
    );
    expect(t).toContain("Resumo da dieta — 2/10 a 3/10");
    expect(t).toContain("• Segui o plano: 7 (78%)");
    expect(t).toContain("Água: média de 1,75 L por dia; meta de 2 L batida em 1 de 2 dias.");
    expect(t).toContain("≈ 1.800 kcal por dia");
    expect(t).toContain("• 2/10, Almoço (12h30): pizza");
    expect(t).toContain("Refeições que mais pulei: Lanche (1×)");
  });

  it("avisa quando não há nada", () => {
    expect(textoParaNutricionista([dia("2026-10-01")], 2000, "x")).toBe("Ainda não há registros para resumir.");
  });
});

describe("resumoDaSemana", () => {
  const r = (nome: string, estado: string) => ({ nome, horario: "16:00", estado, nota: "" });
  it("aponta a refeição mais pulada", () => {
    const dias = [
      dia("a", { seguiu: 3, pulou: 1, agua: 2000, registros: [r("Lanche", "pulou")] }),
      dia("b", { seguiu: 3, pulou: 1, agua: 2000, registros: [r("Lanche", "pulou")] }),
    ];
    expect(resumoDaSemana(dias, 2000)).toBe("75% no plano · água na meta em 2 de 2 dias — ⚠️ você pulou o lanche 2×");
  });
  it("comemora a semana boa", () => {
    expect(resumoDaSemana([dia("a", { seguiu: 5, agua: 2000 })], 2000)).toBe("100% no plano · água na meta em 1 de 1 dias — 🎉 semana redonda");
  });
  it("lembra da água", () => {
    expect(resumoDaSemana([dia("a", { seguiu: 1, agua: 100 }), dia("b", { agua: 0 })], 2000)).toContain("água ficou abaixo");
  });
});

describe("linhaDoPeso", () => {
  it("mostra o peso e a variação desde antes do período", () => {
    const m = [
      { dia: "2026-10-04", peso: 72.4 },
      { dia: "2026-09-27", peso: 73 },
    ];
    expect(linhaDoPeso(m, "2026-09-28")).toEqual(["Peso: 72,4 kg (−0,6 kg desde 27/9)"]);
    expect(linhaDoPeso(m.slice(0, 1), "2026-09-28")).toEqual(["Peso: 72,4 kg (4/10)"]);
    expect(linhaDoPeso([], "x")).toEqual([]);
  });
});
