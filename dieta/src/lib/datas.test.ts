import { describe, expect, it } from "vitest";
import { agoraNoFuso, diaDaSemana, diaPorExtenso, horaFalada, normalizarHora, paraMinutos, somarDias, valeNoDia } from "./datas";

describe("agoraNoFuso", () => {
  it("usa o relógio de São Paulo, não o do servidor", () => {
    // 02h30 em UTC ainda é 23h30 da véspera em São Paulo.
    expect(agoraNoFuso(new Date("2026-10-02T02:30:00Z"))).toEqual({ dia: "2026-10-01", minutos: 23 * 60 + 30, diaDaSemana: 4 });
  });
});

describe("horas", () => {
  it("normaliza o jeito que se escreve hora", () => {
    expect(normalizarHora("7h")).toBe("07:00");
    expect(normalizarHora("7:30")).toBe("07:30");
    expect(normalizarHora("07h30")).toBe("07:30");
    expect(normalizarHora("12")).toBe("12:00");
    expect(normalizarHora("15hs")).toBe("15:00");
    expect(normalizarHora("25:00")).toBeNull();
    expect(normalizarHora("almoço")).toBeNull();
  });

  it("converte para minutos e para a forma falada", () => {
    expect(paraMinutos("12:30")).toBe(750);
    expect(horaFalada("07:30")).toBe("7h30");
    expect(horaFalada("12:00")).toBe("12h");
  });
});

describe("dias", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("sabe o dia da semana e escreve por extenso", () => {
    expect(diaDaSemana("2026-10-02")).toBe(5);
    expect(diaPorExtenso("2026-10-02")).toBe("sexta, 2 de out");
  });

  it("lista vazia de dias vale para todos", () => {
    expect(valeNoDia([], 3)).toBe(true);
    expect(valeNoDia([0, 6], 3)).toBe(false);
    expect(valeNoDia([0, 6], 6)).toBe(true);
  });
});
