import { describe, expect, it } from "vitest";
import { textoParaNutricionista, type DiaDoRelatorio } from "./relatorio";

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
