import { describe, expect, it } from "vitest";
import { avisosDevidos, horariosDaAgua, ritmoDaAgua, type RefeicaoDoPlano, type Situacao } from "./agenda";
import { PADRAO } from "./ajustes";
import { lerTexto } from "./conteudo";

const almoco: RefeicaoDoPlano = {
  id: "alm",
  nome: "Almoço",
  horario: "12:30",
  conteudo: lerTexto("Arroz — 4 col.\nFrango — 120 g"),
  dias: [],
  avisar: true,
};
const lancheDeFimDeSemana: RefeicaoDoPlano = { ...almoco, id: "fds", nome: "Lanche", horario: "16:00", dias: [0, 6] };

const as = (hora: string, extra: Partial<Situacao> = {}): Situacao => {
  const [h, m] = hora.split(":").map(Number);
  return {
    agora: { dia: "2026-10-02", minutos: h * 60 + m, diaDaSemana: 5 },
    refeicoes: [almoco, lancheDeFimDeSemana],
    ajustes: { ...PADRAO, avisarAgua: false },
    marcadas: new Set(),
    aguaHoje: 0,
    enviadas: new Set(),
    ...extra,
  };
};

describe("avisos das refeições", () => {
  it("avisa na hora, com o que comer", () => {
    expect(avisosDevidos(as("12:30"))).toEqual([
      { chave: "2026-10-02|refeicao:alm", titulo: "Almoço · 12h30", corpo: "Arroz — 4 col. · Frango — 120 g", url: "/#r-alm" },
    ]);
  });

  it("não avisa antes da hora, e ainda avisa se o relógio atrasou um pouco", () => {
    expect(avisosDevidos(as("12:29"))).toEqual([]);
    expect(avisosDevidos(as("12:45"))).toHaveLength(1);
    expect(avisosDevidos(as("12:50"))).toEqual([]);
  });

  it("não repete o que já saiu", () => {
    expect(avisosDevidos(as("12:31", { enviadas: new Set(["2026-10-02|refeicao:alm"]) }))).toEqual([]);
  });

  it("não avisa refeição já marcada", () => {
    expect(avisosDevidos(as("12:30", { marcadas: new Set(["alm"]) }))).toEqual([]);
  });

  it("respeita a antecedência", () => {
    const s = as("12:15", { ajustes: { ...PADRAO, avisarAgua: false, antecedencia: 15 } });
    expect(avisosDevidos(s)[0].titulo).toBe("Almoço em 15 min · 12h30");
  });

  it("respeita os dias da semana da refeição", () => {
    expect(avisosDevidos(as("16:00"))).toEqual([]);
    const sabado = as("16:00");
    sabado.agora.diaDaSemana = 6;
    expect(avisosDevidos(sabado).map((a) => a.chave)).toEqual(["2026-10-02|refeicao:fds"]);
  });

  it("respeita o desligado, geral e por refeição", () => {
    expect(avisosDevidos(as("12:30", { ajustes: { ...PADRAO, avisarAgua: false, avisarRefeicoes: false } }))).toEqual([]);
    expect(avisosDevidos(as("12:30", { refeicoes: [{ ...almoco, avisar: false }] }))).toEqual([]);
  });
});

describe("avisos de água", () => {
  const comAgua = (hora: string, extra: Partial<Situacao> = {}) =>
    as(hora, { ajustes: { ...PADRAO, aguaInicio: "08:00", aguaFim: "21:00", aguaIntervalo: 90 }, ...extra });

  it("tem os horários certos", () => {
    expect(horariosDaAgua({ ...PADRAO, aguaInicio: "08:00", aguaFim: "12:00", aguaIntervalo: 90 })).toEqual([480, 570, 660]);
  });

  it("lembra no horário e diz quanto falta", () => {
    const [aviso] = avisosDevidos(comAgua("08:00"));
    expect(aviso.chave).toBe("2026-10-02|agua:480");
    expect(aviso.corpo).toBe("Nenhum copo ainda hoje. A meta é 2 L.");
  });

  it("diz quando está atrás do ritmo", () => {
    // 15h: 7 de 13 horas da janela → o ritmo pede ~1077 ml.
    expect(avisosDevidos(comAgua("15:30", { aguaHoje: 500 }))[0].corpo).toBe(
      "500 ml de 2 L — 654 ml atrás do ritmo. Um copo agora?",
    );
  });

  it("para quando a meta foi batida", () => {
    expect(avisosDevidos(comAgua("08:00", { aguaHoje: 2000 }))).toEqual([]);
  });

  it("pula o lembrete que cairia perto de uma refeição", () => {
    // 12h30 é horário de água (8h + 3 × 90 min) e é o almoço: sai só o almoço.
    expect(avisosDevidos(comAgua("12:30")).map((a) => a.chave)).toEqual(["2026-10-02|refeicao:alm"]);
  });

  it("calcula o ritmo nas pontas", () => {
    expect(ritmoDaAgua(PADRAO, 7 * 60)).toBe(0);
    expect(ritmoDaAgua(PADRAO, 22 * 60)).toBe(PADRAO.aguaMeta);
  });
});
