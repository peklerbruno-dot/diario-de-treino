import { describe, expect, it } from "vitest";
import { agoraPorExtenso, localParaUtc, proximaVez, utcParaLocal } from "./datas";

const SP = "America/Sao_Paulo";

describe("localParaUtc / utcParaLocal", () => {
  it("São Paulo está 3 horas atrás de UTC", () => {
    expect(localParaUtc("2026-09-28T09:00", SP)?.toISOString()).toBe("2026-09-28T12:00:00.000Z");
  });
  it("vai e volta sem perder nada", () => {
    expect(utcParaLocal(localParaUtc("2026-12-31T23:30", SP)!, SP)).toBe("2026-12-31T23:30");
  });
  it("respeita o horário de verão onde ele existe", () => {
    expect(localParaUtc("2026-07-01T09:00", "Europe/Lisbon")?.toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(localParaUtc("2026-01-01T09:00", "Europe/Lisbon")?.toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });
  it("recusa o que não é data com hora", () => {
    expect(localParaUtc("amanhã às 9", SP)).toBeNull();
    expect(localParaUtc("2026-13-01T09:00", SP)).toBeNull();
  });
});

describe("agoraPorExtenso", () => {
  it("escreve o dia da semana em português", () => {
    expect(agoraPorExtenso(new Date("2026-09-27T17:05:00Z"), SP)).toBe("domingo, 27/09/2026, 14:05");
  });
});

describe("proximaVez", () => {
  const as8 = localParaUtc("2026-09-25T08:00", SP)!; // sexta

  it("diário: o dia seguinte, mesma hora", () => {
    expect(utcParaLocal(proximaVez(as8, "diario", as8, SP), SP)).toBe("2026-09-26T08:00");
  });
  it("dias úteis: de sexta pula para segunda", () => {
    expect(utcParaLocal(proximaVez(as8, "dias-uteis", as8, SP), SP)).toBe("2026-09-28T08:00");
  });
  it("semanal: sete dias depois", () => {
    expect(utcParaLocal(proximaVez(as8, "semanal", as8, SP), SP)).toBe("2026-10-02T08:00");
  });
  it("mensal no dia 31 cai no último dia dos meses curtos, e volta ao 31", () => {
    const d31 = localParaUtc("2026-01-31T10:00", SP)!;
    const fev = proximaVez(d31, "mensal", d31, SP);
    expect(utcParaLocal(fev, SP)).toBe("2026-02-28T10:00");
    expect(utcParaLocal(proximaVez(d31, "mensal", fev, SP), SP)).toBe("2026-03-31T10:00");
  });
  it("pula as vezes perdidas: toca uma vez só depois de dias fora do ar", () => {
    const tresDiasDepois = localParaUtc("2026-09-28T12:00", SP)!;
    expect(utcParaLocal(proximaVez(as8, "diario", tresDiasDepois, SP), SP)).toBe("2026-09-29T08:00");
  });
});
