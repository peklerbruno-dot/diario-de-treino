import { describe, expect, it } from "vitest";
import { mensagensEmTexto, resumirThread } from "./conversas";
import type { MensagemGmail } from "./gmail";

const b64 = (t: string) => Buffer.from(t, "utf8").toString("base64url");

function msg(id: string, de: string, para: string, texto: string, quando: string, rotulos: string[] = []): MensagemGmail {
  return {
    id,
    threadId: "t",
    labelIds: rotulos,
    snippet: texto.slice(0, 40),
    internalDate: String(Date.parse(quando)),
    payload: {
      mimeType: "text/plain",
      headers: [
        { name: "From", value: de },
        { name: "To", value: para },
        { name: "Subject", value: "Solicitação de Verba para Banca" },
      ],
      body: { data: b64(texto) },
    },
  };
}

const EU = "brunopekler@usp.br";

describe("resumirThread", () => {
  it("mostra quem falou por último que não é você, e sabe que a última é sua", () => {
    const r = resumirThread(
      [
        msg("1", "Monitoria do LETRA <monitoriadoletra@gmail.com>", EU, "Qual seria o arquivo?", "2026-09-29T17:47:00Z"),
        msg("2", `Bruno Pekler <${EU}>`, "monitoriadoletra@gmail.com", "Era o formulário.", "2026-10-06T12:00:00Z", ["SENT"]),
      ],
      EU,
    )!;
    expect(r.remetente).toBe("Monitoria do LETRA");
    expect(r.ultimaDeMim).toBe(true);
    expect(r.ultimaMensagemId).toBe("2");
    expect(r.assunto).toBe("Solicitação de Verba para Banca");
  });
  it("ignora rascunhos dentro da conversa", () => {
    const r = resumirThread(
      [
        msg("1", "Manu <manuelasdzi@gmail.com>", EU, "Segue o mailing", "2026-09-30T17:22:00Z"),
        msg("2", EU, "manuelasdzi@gmail.com", "rascunho", "2026-10-06T22:00:00Z", ["DRAFT"]),
      ],
      EU,
    )!;
    expect(r.ultimaMensagemId).toBe("1");
    expect(r.ultimaDeMim).toBe(false);
  });
  it("numa conversa só sua, mostra para quem você escreveu", () => {
    const r = resumirThread([msg("1", EU, "Fulano <f@x.com>", "Oi", "2026-10-01T10:00:00Z", ["SENT"])], EU)!;
    expect(r.remetente).toBe("Para: Fulano");
  });
});

describe("mensagensEmTexto", () => {
  it("tira a citação e corta o que passa do limite", () => {
    const longa = "a".repeat(50);
    const [m] = mensagensEmTexto(
      [msg("1", "x@y.com", EU, `${longa}\n\nEm seg., 5 de out. de 2026 às 14:13, Z <z@z> escreveu:\n> velho`, "2026-10-05T10:00:00Z")],
      5,
      20,
    );
    expect(m.texto).toBe(`${"a".repeat(20)}\n[…mensagem cortada…]`);
  });
});
