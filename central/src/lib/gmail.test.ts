import { describe, expect, it } from "vitest";
import {
  anexos,
  assuntoDeResposta,
  corpoEmTexto,
  destinatariosDaResposta,
  enderecos,
  montarMime,
  semCitacao,
  separarEndereco,
  type MensagemGmail,
} from "./gmail";

const b64 = (t: string) => Buffer.from(t, "utf8").toString("base64url");

function msg(id: string, de: string, para: string, extra: Partial<MensagemGmail> = {}, cc = ""): MensagemGmail {
  return {
    id,
    threadId: "t1",
    payload: {
      headers: [
        { name: "From", value: de },
        { name: "To", value: para },
        ...(cc ? [{ name: "Cc", value: cc }] : []),
        { name: "Subject", value: "Assunto" },
      ],
      mimeType: "text/plain",
      body: { data: b64("oi") },
    },
    ...extra,
  };
}

describe("endereços", () => {
  it("separa nome e e-mail", () => {
    expect(separarEndereco('"Monitoria do LETRA" <MonitoriaDoLetra@gmail.com>')).toEqual({
      nome: "Monitoria do LETRA",
      email: "monitoriadoletra@gmail.com",
    });
    expect(separarEndereco("nrozench@usp.br")).toEqual({ nome: "nrozench@usp.br", email: "nrozench@usp.br" });
  });
  it("lê listas com vírgula dentro das aspas", () => {
    expect(enderecos('"Silva, Ana" <ana@x.com>, beto@y.com')).toEqual(["ana@x.com", "beto@y.com"]);
  });
});

describe("corpo", () => {
  it("prefere o text/plain de uma mensagem multipart", () => {
    const m: MensagemGmail = {
      id: "1",
      threadId: "t",
      payload: {
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: b64("Olá, Bruno\r\nTudo bem?") } },
          { mimeType: "text/html", body: { data: b64("<p>Olá</p>") } },
        ],
      },
    };
    expect(corpoEmTexto(m)).toBe("Olá, Bruno\nTudo bem?");
  });
  it("limpa o HTML quando não há texto puro", () => {
    const m: MensagemGmail = {
      id: "1",
      threadId: "t",
      payload: { mimeType: "text/html", body: { data: b64("<style>x{}</style><p>Um&nbsp;dois</p><br>três") } },
    };
    expect(corpoEmTexto(m)).toBe("Um dois\n\ntrês");
  });
  it("corta a citação em português e em inglês", () => {
    expect(
      semCitacao("Muito obrigado!\n\nEm seg., 5 de out. de 2026 às 14:13, Fulano <f@x.com> escreveu:\n> texto antigo"),
    ).toBe("Muito obrigado!");
    expect(semCitacao("Yes!\n\nOn Thu, 1 Oct 2026, Ana wrote:\n> old")).toBe("Yes!");
    expect(semCitacao("Ok\n\nEm sex., 2 de out. de 2026 às 05:33, Anoushka\n<a@soton.ac.uk> escreveu:\n> x")).toBe(
      "Ok",
    );
  });
  it("lista os anexos", () => {
    const m: MensagemGmail = {
      id: "m1",
      threadId: "t",
      payload: {
        mimeType: "multipart/mixed",
        parts: [
          { mimeType: "text/plain", body: { data: b64("segue") } },
          {
            mimeType: "application/pdf",
            filename: "oficio.pdf",
            body: { attachmentId: "A1", size: 1234 },
          },
        ],
      },
    };
    expect(anexos(m)).toEqual([
      { mensagemId: "m1", anexoId: "A1", nome: "oficio.pdf", tipo: "application/pdf", tamanho: 1234 },
    ]);
  });
});

describe("resposta", () => {
  it("não empilha Re:", () => {
    expect(assuntoDeResposta("Mailing")).toBe("Re: Mailing");
    expect(assuntoDeResposta("RE: Mailing")).toBe("RE: Mailing");
  });
  it("responde a todos, sem você", () => {
    const conversa = [
      msg("1", "Bruno <brunopekler@usp.br>", "defesaspos.fflch@usp.br", {}, "nrozench@usp.br"),
      msg("2", "Defesas <defesaspos.fflch@usp.br>", "brunopekler@usp.br", {}, "nrozench@usp.br"),
    ];
    expect(destinatariosDaResposta(conversa, "brunopekler@usp.br")).toEqual({
      para: ["defesaspos.fflch@usp.br"],
      cc: ["nrozench@usp.br"],
    });
  });
  it("monta um MIME que o Gmail aceita, com acento no assunto", () => {
    const raw = montarMime({
      para: ["a@x.com"],
      assunto: "Re: Solicitação",
      corpo: "Olá\nAté logo",
      emRespostaA: "<abc@mail>",
    });
    const texto = Buffer.from(raw, "base64url").toString("utf8");
    expect(texto).toContain("To: a@x.com");
    expect(texto).toContain(`Subject: =?UTF-8?B?${Buffer.from("Re: Solicitação").toString("base64")}?=`);
    expect(texto).toContain("In-Reply-To: <abc@mail>");
    const corpo = texto.split("\r\n\r\n")[1].replace(/\r\n/g, "");
    expect(Buffer.from(corpo, "base64").toString("utf8")).toBe("Olá\r\nAté logo");
  });
});
