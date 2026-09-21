import { describe, expect, it } from "vitest";
import { linkDoGoogle, montarIcs, type EventoDaAgenda } from "./agenda";

const AGORA = new Date("2026-06-01T12:00:00Z");

const evento = (ajustes: Partial<EventoDaAgenda> = {}): EventoDaAgenda => ({
  uid: "atividade-1@cej.usp.br",
  titulo: "Aula inaugural",
  dia: "2026-06-03",
  hora: "19:00",
  diaFinal: null,
  horaFinal: null,
  local: "Sala 14, FFLCH",
  descricao: null,
  cancelado: false,
  ...ajustes,
});

const gerar = (e: EventoDaAgenda[]) => montarIcs(e, { nome: "CEJ", agora: AGORA });
const linhas = (texto: string) => texto.split("\r\n");

describe("o esqueleto do arquivo", () => {
  it("abre e fecha como um calendário, com o fuso declarado dentro", () => {
    const ics = gerar([evento()]);
    expect(linhas(ics)[0]).toBe("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("TZID:America/Sao_Paulo");
    expect(ics).toContain("TZOFFSETTO:-0300");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("separa as linhas com CRLF, que é o que o formato exige", () => {
    // Com \n sozinho, parte dos programas lê o arquivo como uma linha só.
    const ics = gerar([evento()]);
    expect(ics).toContain("\r\n");
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });
});

describe("um evento com hora", () => {
  it("escreve início e fim no fuso de São Paulo, sem converter nada", () => {
    const ics = gerar([evento()]);
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20260603T190000");
    // Sem hora de término declarada, duas horas.
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20260603T210000");
  });

  it("respeita a hora de término quando ela existe", () => {
    const ics = gerar([evento({ horaFinal: "20:30" })]);
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20260603T203000");
  });

  it("atravessa a meia-noite sem cair no dia errado", () => {
    const ics = gerar([evento({ hora: "23:00" })]);
    expect(ics).toContain("DTSTART;TZID=America/Sao_Paulo:20260603T230000");
    expect(ics).toContain("DTEND;TZID=America/Sao_Paulo:20260604T010000");
  });
});

describe("um evento de dia inteiro", () => {
  it("termina no dia seguinte, porque o fim é exclusivo", () => {
    // Com DTEND igual ao DTSTART, o evento não aparece em lugar nenhum.
    const ics = gerar([evento({ hora: null })]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260603");
    expect(ics).toContain("DTEND;VALUE=DATE:20260604");
  });

  it("cobre um congresso de vários dias até o último, inclusive", () => {
    const ics = gerar([evento({ hora: null, diaFinal: "2026-06-06" })]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260603");
    expect(ics).toContain("DTEND;VALUE=DATE:20260607");
  });
});

describe("o texto dentro do arquivo", () => {
  it("escapa vírgula, ponto e vírgula, barra e quebra de linha", () => {
    const ics = gerar([
      evento({
        titulo: "Mesa: memória, exílio; e retorno",
        descricao: "Primeira linha\nSegunda linha 50% \\ ok",
      }),
    ]);
    expect(ics).toContain("SUMMARY:Mesa: memória\\, exílio\; e retorno");
    expect(ics).toContain("DESCRIPTION:Primeira linha\\nSegunda linha 50% \\\\ ok");
  });

  it("dobra linha longa sem partir um acento ao meio", () => {
    const titulo = "Simpósio de estudos judaicos e a história intelectual do século XX na América";
    const ics = gerar([evento({ titulo })]);

    for (const linha of linhas(ics)) {
      expect(Buffer.from(linha, "utf8").length).toBeLessThanOrEqual(75);
    }
    // Desdobrar é juntar tirando o espaço da frente das continuações: o título
    // tem que voltar inteiro, com os acentos no lugar.
    expect(ics.replace(/\r\n /g, "")).toContain(`SUMMARY:${titulo}`);
  });

  it("põe o prefixo na frente, para a agenda dizer o que é aquilo", () => {
    const ics = gerar([evento({ prefixo: "Reunião" })]);
    expect(ics).toContain("SUMMARY:Reunião: Aula inaugural");
  });

  it("não repete o prefixo que o título já diz", () => {
    // Senão a agenda de todo mundo mostra "Reunião: Reunião de planejamento".
    const ics = gerar([
      evento({ prefixo: "Reunião", titulo: "Reunião de planejamento do semestre" }),
    ]);
    expect(ics).toContain("SUMMARY:Reunião de planejamento do semestre");
    expect(ics).not.toContain("Reunião: Reunião");
  });

  it("nem quando o título começa com a palavra em outra caixa", () => {
    const ics = gerar([evento({ prefixo: "Reunião", titulo: "REUNIÃO extraordinária" })]);
    expect(ics).toContain("SUMMARY:REUNIÃO extraordinária");
  });
});

describe("o que foi cancelado", () => {
  it("continua no calendário, marcado como cancelado", () => {
    // Sumir do calendário deixaria quem já se programou sem saber que não há mais.
    const ics = gerar([evento({ cancelado: true })]);
    expect(ics).toContain("STATUS:CANCELLED");
    expect(ics).toContain("SUMMARY:Aula inaugural");
  });
});

describe("o link de adicionar ao Google", () => {
  it("leva data, fuso, local e título", () => {
    const url = new URL(linkDoGoogle(evento()));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Aula inaugural");
    expect(url.searchParams.get("dates")).toBe("20260603T190000/20260603T210000");
    expect(url.searchParams.get("ctz")).toBe("America/Sao_Paulo");
    expect(url.searchParams.get("location")).toBe("Sala 14, FFLCH");
  });

  it("no dia inteiro vai sem fuso e com o fim no dia seguinte", () => {
    const url = new URL(linkDoGoogle(evento({ hora: null })));
    expect(url.searchParams.get("dates")).toBe("20260603/20260604");
    expect(url.searchParams.has("ctz")).toBe(false);
  });
});
