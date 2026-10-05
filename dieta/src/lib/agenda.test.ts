import { describe, expect, it } from "vitest";
import { avisosDevidos, horariosDaAgua, resumoDoDia, ritmoDaAgua, type RefeicaoDoPlano, type Situacao } from "./agenda";
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

describe("lembretes seus", () => {
  const creatina = { id: "cr", titulo: "Creatina", texto: "5 g com água", horario: "08:00", dias: [], ativo: true };

  it("tocam na hora, com o texto", () => {
    expect(avisosDevidos(as("08:05", { lembretes: [creatina] }))).toEqual([
      { chave: "2026-10-02|lembrete:cr", titulo: "⏰ Creatina", corpo: "5 g com água", url: "/" },
    ]);
  });

  it("respeitam desligado, dias e o que já saiu", () => {
    expect(avisosDevidos(as("08:00", { lembretes: [{ ...creatina, ativo: false }] }))).toEqual([]);
    expect(avisosDevidos(as("08:00", { lembretes: [{ ...creatina, dias: [1] }] }))).toEqual([]);
    expect(avisosDevidos(as("08:00", { lembretes: [creatina], enviadas: new Set(["2026-10-02|lembrete:cr"]) }))).toEqual([]);
  });
});

describe("resumo da noite", () => {
  it("sai na hora do resumo, contando o dia", () => {
    const [r] = avisosDevidos(as("21:30", { marcadas: new Set(["alm"]), seguidas: 1, aguaHoje: 1500 }));
    expect(r).toEqual({ chave: "2026-10-02|resumo", titulo: "Seu dia", corpo: "1 de 1 refeições no plano · 💧 1,5 L de 2 L", url: "/historico/dia/2026-10-02" });
  });

  it("conta o que ficou sem marcar e a meta batida", () => {
    expect(resumoDoDia(5, 3, 2, 2500, 2000)).toBe("2 de 5 refeições no plano (2 sem marcar) · 💧 meta batida (2,5 L)");
  });

  it("não sai desligado", () => {
    expect(avisosDevidos(as("21:30", { ajustes: { ...PADRAO, avisarAgua: false, resumoNoturno: false } }))).toEqual([]);
  });
});

describe("cobrança, treino e semana", () => {
  it("pergunta como foi a refeição não marcada uma hora depois", () => {
    const [a] = avisosDevidos(as("13:30"));
    expect(a).toEqual({ chave: "2026-10-02|cobrar:alm", titulo: "Como foi o almoço?", corpo: "Toque para marcar: segui, troquei ou pulei.", url: "/#r-alm" });
    expect(avisosDevidos(as("13:30", { marcadas: new Set(["alm"]) }))).toEqual([]);
    expect(avisosDevidos(as("13:30", { ajustes: { ...PADRAO, avisarAgua: false, cobrarMarcacao: false } }))).toEqual([]);
  });

  it("avisa pré e pós-treino só nos dias de treino", () => {
    const treino = { ...PADRAO, avisarAgua: false, treinoAvisos: true, treinoDias: [5], treinoHora: "18:00", treinoDuracao: 60, preTreino: "Banana" };
    expect(avisosDevidos(as("17:00", { ajustes: treino }))[0]).toMatchObject({ chave: "2026-10-02|treino:pre", corpo: "Banana" });
    expect(avisosDevidos(as("19:00", { ajustes: treino }))[0]).toMatchObject({ chave: "2026-10-02|treino:pos" });
    expect(avisosDevidos(as("17:00", { ajustes: { ...treino, treinoDias: [1] } }))).toEqual([]);
  });

  it("manda o resumo da semana só no domingo", () => {
    const domingo = as("19:00", { resumoDaSemana: "80% no plano" });
    domingo.agora.diaDaSemana = 0;
    expect(avisosDevidos(domingo).map((a) => a.chave)).toContain("2026-10-02|semana");
    expect(avisosDevidos(as("19:00", { resumoDaSemana: "80% no plano" })).map((a) => a.chave)).not.toContain("2026-10-02|semana");
  });
});
