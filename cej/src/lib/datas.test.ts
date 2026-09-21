import { describe, expect, it } from "vitest";
import {
  comMaiuscula, comoPrazo, comDiaDaSemana, curto, diaDaSemana, diasNoMes, distanciaEmDias,
  ehDiaValido, ehHoraValida, gradeDoMes, mesAnterior, mesSeguinte, normalizarHora,
  porBarras, porExtenso, somarDias,
} from "./datas";

describe("dia de caderno", () => {
  it("recusa o que não é data", () => {
    expect(ehDiaValido("2026-06-03")).toBe(true);
    expect(ehDiaValido("3/6/2026")).toBe(false);
    expect(ehDiaValido("2026-13-01")).toBe(false);
    expect(ehDiaValido("")).toBe(false);
    expect(ehDiaValido(null)).toBe(false);
  });

  it("sabe que 31 de fevereiro não existe, e que 29 existe em ano bissexto", () => {
    expect(ehDiaValido("2026-02-31")).toBe(false);
    expect(ehDiaValido("2026-02-29")).toBe(false);
    expect(ehDiaValido("2028-02-29")).toBe(true);
    expect(diasNoMes(2028, 2)).toBe(29);
    expect(diasNoMes(2026, 11)).toBe(30);
  });
});

describe("hora", () => {
  it("aceita o que a pessoa digita de verdade", () => {
    expect(normalizarHora("19:00")).toBe("19:00");
    expect(normalizarHora("9:5")).toBe("09:05");
    expect(normalizarHora("19h30")).toBe("19:30");
    expect(normalizarHora("19")).toBe("19:00");
    expect(normalizarHora("19,30")).toBe("19:30");
  });

  it("recusa hora que não existe", () => {
    expect(normalizarHora("25:00")).toBeNull();
    expect(normalizarHora("12:74")).toBeNull();
    expect(normalizarHora("de manhã")).toBeNull();
    expect(normalizarHora("")).toBeNull();
    expect(ehHoraValida("19:00")).toBe(true);
    expect(ehHoraValida("19:60")).toBe(false);
  });
});

describe("andar no calendário", () => {
  it("atravessa a virada do mês e do ano", () => {
    expect(somarDias("2026-06-30", 1)).toBe("2026-07-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("conta a distância com sinal", () => {
    expect(distanciaEmDias("2026-06-01", "2026-06-10")).toBe(9);
    expect(distanciaEmDias("2026-06-10", "2026-06-01")).toBe(-9);
    expect(distanciaEmDias("2026-06-01", "2026-06-01")).toBe(0);
  });

  it("acha o dia da semana", () => {
    // 3 de junho de 2026 é uma quarta-feira.
    expect(diaDaSemana("2026-06-03")).toBe(3);
  });

  it("vira o mês nas duas pontas do ano", () => {
    expect(mesSeguinte("2026-12")).toBe("2027-01");
    expect(mesAnterior("2026-01")).toBe("2025-12");
    expect(mesSeguinte("2026-06")).toBe("2026-07");
  });
});

describe("como a data é dita", () => {
  it("escreve em português", () => {
    expect(porExtenso("2026-06-03")).toBe("3 de junho de 2026");
    expect(comDiaDaSemana("2026-06-03")).toBe("quarta, 3 de junho");
    expect(porBarras("2026-06-03")).toBe("03/06/2026");
    expect(curto("2026-06-03")).toBe("3 jun");
  });

  it("levanta só a primeira letra — o 'de' do meio fica minúsculo", () => {
    expect(comMaiuscula("outubro de 2026")).toBe("Outubro de 2026");
    expect(comMaiuscula("quarta, 3 de junho")).toBe("Quarta, 3 de junho");
    expect(comMaiuscula("")).toBe("");
  });

  it("diz o prazo pela distância, não pela data", () => {
    const hoje = "2026-06-10";
    expect(comoPrazo("2026-06-10", hoje)).toBe("hoje");
    expect(comoPrazo("2026-06-11", hoje)).toBe("amanhã");
    expect(comoPrazo("2026-06-09", hoje)).toBe("ontem");
    expect(comoPrazo("2026-06-05", hoje)).toBe("há 5 dias");
    expect(comoPrazo("2026-06-14", hoje)).toBe("em 4 dias");
    // Longe demais para "em N dias" dizer algo: aí a data em si informa mais.
    expect(comoPrazo("2026-08-01", hoje)).toBe("1 ago");
  });
});

describe("a grade do mês", () => {
  it("entrega semanas inteiras, de domingo a sábado", () => {
    const grade = gradeDoMes("2026-06");
    expect(grade.every((semana) => semana.length === 7)).toBe(true);
    expect(diaDaSemana(grade[0][0].dia)).toBe(0);
    expect(diaDaSemana(grade[grade.length - 1][6].dia)).toBe(6);
  });

  it("marca o que é do mês e o que entrou só para fechar a semana", () => {
    // Junho de 2026 começa numa segunda: o domingo da primeira linha é 31 de maio.
    const grade = gradeDoMes("2026-06");
    expect(grade[0][0]).toEqual({ dia: "2026-05-31", doMes: false });
    expect(grade[0][1]).toEqual({ dia: "2026-06-01", doMes: true });

    const dias = grade.flat().filter((c) => c.doMes);
    expect(dias.length).toBe(30);
  });

  it("cobre o mês que começa no próprio domingo sem inventar uma semana vazia", () => {
    // Março de 2026 começa num domingo.
    const grade = gradeDoMes("2026-03");
    expect(grade[0][0]).toEqual({ dia: "2026-03-01", doMes: true });
    expect(grade.flat().filter((c) => c.doMes).length).toBe(31);
  });
});
