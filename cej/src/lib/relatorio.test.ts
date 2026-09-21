import { describe, expect, it } from "vitest";
import {
  entraNoRelatorio, noPeriodo, paraPlanilha, resumir, type AtividadeDoRelatorio,
} from "./relatorio";

let n = 0;
const atividade = (ajustes: Partial<AtividadeDoRelatorio> = {}): AtividadeDoRelatorio => ({
  id: `a${++n}`,
  titulo: "Palestra",
  tipo: "PALESTRA",
  estado: "REALIZADA",
  dia: "2026-03-10",
  diaFinal: null,
  local: null,
  parceria: null,
  publicoPresente: null,
  responsavelNome: null,
  convidados: [],
  ...ajustes,
});

describe("o que entra na conta", () => {
  it("só o que aconteceu", () => {
    expect(entraNoRelatorio(atividade({ estado: "REALIZADA" }))).toBe(true);
    expect(entraNoRelatorio(atividade({ estado: "IDEIA" }))).toBe(false);
    expect(entraNoRelatorio(atividade({ estado: "DIVULGACAO" }))).toBe(false);
    expect(entraNoRelatorio(atividade({ estado: "CANCELADA" }))).toBe(false);
  });

  it("o período inclui as duas pontas", () => {
    const lista = [
      atividade({ dia: "2026-01-01" }),
      atividade({ dia: "2026-06-15" }),
      atividade({ dia: "2026-12-31" }),
      atividade({ dia: "2027-01-01" }),
    ];
    expect(noPeriodo(lista, "2026-01-01", "2026-12-31")).toHaveLength(3);
  });
});

describe("os números do resumo", () => {
  it("conta por tipo, do mais frequente para o menos", () => {
    const resumo = resumir([
      atividade({ tipo: "PALESTRA" }),
      atividade({ tipo: "PALESTRA" }),
      atividade({ tipo: "CURSO" }),
    ]);
    expect(resumo.total).toBe(3);
    expect(resumo.porTipo[0]).toEqual({ tipo: "PALESTRA", nome: "Palestra", quantidade: 2 });
    expect(resumo.porTipo[1].quantidade).toBe(1);
  });

  it("conta por mês em ordem de calendário", () => {
    const resumo = resumir([
      atividade({ dia: "2026-11-02" }),
      atividade({ dia: "2026-03-10" }),
      atividade({ dia: "2026-03-28" }),
    ]);
    expect(resumo.porMes.map((m) => [m.mes, m.quantidade])).toEqual([
      ["2026-03", 2],
      ["2026-11", 1],
    ]);
    expect(resumo.porMes[0].nome).toBe("março de 2026");
  });

  it("diz quantas atividades informaram público, e não só a soma", () => {
    // Sem esse segundo número, "480 pessoas em 12 atividades" mente por omissão:
    // podem ter sido 480 em três, e nove sem ninguém ter anotado nada.
    const resumo = resumir([
      atividade({ publicoPresente: 100 }),
      atividade({ publicoPresente: 45 }),
      atividade({ publicoPresente: null }),
    ]);
    expect(resumo.publicoTotal).toBe(145);
    expect(resumo.quantasInformaramPublico).toBe(2);
    expect(resumo.total).toBe(3);
  });

  it("conta a mesma convidada uma vez só, em quantas mesas ela tenha estado", () => {
    const resumo = resumir([
      atividade({ convidados: [{ nome: "Ana Braun", instituicao: "USP", funcao: null }] }),
      atividade({
        convidados: [
          { nome: "ana braun", instituicao: "USP", funcao: "mediação" },
          { nome: "Davi Stern", instituicao: null, funcao: null },
        ],
      }),
    ]);
    expect(resumo.quantosConvidados).toBe(3);
    expect(resumo.convidadosDistintos).toBe(2);
  });

  it("não quebra quando não há nada no período", () => {
    const resumo = resumir([]);
    expect(resumo).toMatchObject({ total: 0, publicoTotal: 0, convidadosDistintos: 0 });
    expect(resumo.porTipo).toEqual([]);
  });
});

describe("a planilha", () => {
  it("usa ponto e vírgula, que é o que o Excel em português espera", () => {
    const csv = paraPlanilha([atividade({ titulo: "Aula inaugural" })]);
    expect(csv.split("\r\n")[0]).toContain('"Data";"Data final";"Tipo"');
    expect(csv).toContain('"Aula inaugural"');
  });

  it("começa com o BOM, senão os acentos chegam quebrados no Excel", () => {
    expect(paraPlanilha([])).toMatch(/^﻿/);
  });

  it("aguenta um título com aspas e com ponto e vírgula dentro", () => {
    const csv = paraPlanilha([atividade({ titulo: 'A "questão" judaica; e outras' })]);
    expect(csv).toContain('"A ""questão"" judaica; e outras"');
    // A linha continua tendo o mesmo número de colunas do cabeçalho.
    const colunas = (linha: string) => linha.split('";"').length;
    const [cabecalho, primeira] = csv.split("\r\n");
    expect(colunas(primeira)).toBe(colunas(cabecalho));
  });

  it("escreve as datas como se lê, e junta os convidados numa célula", () => {
    const csv = paraPlanilha([
      atividade({
        dia: "2026-03-10",
        diaFinal: "2026-03-12",
        convidados: [
          { nome: "Ana Braun", instituicao: "USP", funcao: null },
          { nome: "Davi Stern", instituicao: null, funcao: null },
        ],
      }),
    ]);
    expect(csv).toContain('"10/03/2026";"12/03/2026"');
    expect(csv).toContain('"Ana Braun (USP), Davi Stern"');
  });
});
