import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O envio, com a rede no lugar dela.
 *
 * `fetch` é trocado por um espião: não há e-mail saindo daqui, e o teste roda
 * sem chave, sem internet e sem custo. O que se verifica é o que eu de fato
 * mando ao serviço — e como o sistema se comporta quando ele recusa, que é a
 * parte que ninguém experimenta antes de acontecer de verdade.
 */

const mensagem = (para = "ana@usp.br") => ({
  para,
  assunto: "Boletim de outubro",
  html: "<p>oi</p>",
  texto: "oi",
  linkDeDescadastro: "https://cej.vercel.app/descadastrar/chave-da-ana",
});

async function carregar() {
  vi.resetModules();
  return import("./email");
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_uma_chave_de_mentira_comprida");
  vi.stubEnv("EMAIL_REMETENTE", "Centro de Estudos Judaicos <boletim@cej.org>");
  vi.stubEnv("EMAIL_RESPONDER_PARA", "cej@usp.br");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("saber se dá para enviar", () => {
  it("com chave e remetente, está pronto", async () => {
    const { servicoConfigurado, porQueNaoConfigurado } = await carregar();
    expect(servicoConfigurado()).toBe(true);
    expect(porQueNaoConfigurado()).toBeNull();
  });

  it("sem chave, diz o que falta em português e não em código de erro", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { servicoConfigurado, porQueNaoConfigurado } = await carregar();
    expect(servicoConfigurado()).toBe(false);
    expect(porQueNaoConfigurado()).toContain("RESEND_API_KEY");
  });

  it("sem remetente também", async () => {
    vi.stubEnv("EMAIL_REMETENTE", "");
    const { porQueNaoConfigurado } = await carregar();
    expect(porQueNaoConfigurado()).toContain("EMAIL_REMETENTE");
  });
});

describe("o que vai para o serviço", () => {
  it("leva remetente, responder-para e as duas versões da mensagem", async () => {
    const { montarPedido } = await carregar();
    const [pedido] = montarPedido([mensagem()]);

    expect(pedido).toMatchObject({
      from: "Centro de Estudos Judaicos <boletim@cej.org>",
      to: ["ana@usp.br"],
      subject: "Boletim de outubro",
      html: "<p>oi</p>",
      text: "oi",
      reply_to: "cej@usp.br",
    });
  });

  it("leva o cabeçalho que faz o Gmail mostrar o botão de cancelar inscrição", async () => {
    // Quem cancela pelo botão não marca como spam — e a marcação de spam
    // estraga a entrega dos e-mails seguintes para todo mundo, não só para ela.
    const { montarPedido } = await carregar();
    const [pedido] = montarPedido([mensagem()]);

    expect(pedido.headers).toEqual({
      "List-Unsubscribe": "<https://cej.vercel.app/descadastrar/chave-da-ana>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("sem responder-para configurado, o campo simplesmente não vai", async () => {
    vi.stubEnv("EMAIL_RESPONDER_PARA", "");
    const { montarPedido } = await carregar();
    expect(montarPedido([mensagem()])[0]).not.toHaveProperty("reply_to");
  });
});

describe("mandar um lote", () => {
  it("manda tudo numa chamada só, autenticada", async () => {
    const espiao = vi.fn().mockResolvedValue({ ok: true, text: async () => "{}" });
    vi.stubGlobal("fetch", espiao);

    const { enviarLote } = await carregar();
    const resultado = await enviarLote([mensagem("a@usp.br"), mensagem("b@usp.br")]);

    expect(resultado.ok).toBe(true);
    expect(espiao).toHaveBeenCalledTimes(1);

    const [url, opcoes] = espiao.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails/batch");
    expect(opcoes.headers.Authorization).toBe("Bearer re_uma_chave_de_mentira_comprida");
    expect(JSON.parse(opcoes.body)).toHaveLength(2);
  });

  it("quando o serviço recusa, devolve o motivo dele inteiro", async () => {
    // A mensagem do serviço é sempre a que diz o que fazer ("domínio não
    // verificado", "chave inválida"); resumi-la só faria a pessoa ir procurar.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"message":"The cej.org domain is not verified"}',
    }));

    const { enviarLote } = await carregar();
    const resultado = await enviarLote([mensagem()]);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.erro).toContain("403");
      expect(resultado.erro).toContain("domain is not verified");
    }
  });

  it("quando a rede cai, não explode — devolve o erro para ficar registrado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")));

    const { enviarLote } = await carregar();
    const resultado = await enviarLote([mensagem()]);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toContain("ENOTFOUND");
  });

  it("sem serviço configurado, nem tenta a rede", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const espiao = vi.fn();
    vi.stubGlobal("fetch", espiao);

    const { enviarLote } = await carregar();
    const resultado = await enviarLote([mensagem()]);

    expect(resultado.ok).toBe(false);
    expect(espiao).not.toHaveBeenCalled();
  });

  it("um lote vazio é sucesso, e não uma chamada à toa", async () => {
    const espiao = vi.fn();
    vi.stubGlobal("fetch", espiao);

    const { enviarLote } = await carregar();
    expect((await enviarLote([])).ok).toBe(true);
    expect(espiao).not.toHaveBeenCalled();
  });

  it("em produção, ignora a brecha de teste e vai para o Resend", async () => {
    // Uma variável mal preenchida no painel faria os boletins saírem para o
    // vazio em silêncio — o pior defeito possível num sistema de envio.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_API_BASE", "http://localhost:9999");
    const espiao = vi.fn().mockResolvedValue({ ok: true, text: async () => "{}" });
    vi.stubGlobal("fetch", espiao);

    const { enviarLote } = await carregar();
    await enviarLote([mensagem()]);

    expect(espiao.mock.calls[0][0]).toBe("https://api.resend.com/emails/batch");
  });

  it("fora de produção, a brecha de teste vale — é o que permite provar o envio", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("EMAIL_API_BASE", "http://localhost:9999/");
    const espiao = vi.fn().mockResolvedValue({ ok: true, text: async () => "{}" });
    vi.stubGlobal("fetch", espiao);

    const { enviarLote } = await carregar();
    await enviarLote([mensagem()]);

    expect(espiao.mock.calls[0][0]).toBe("http://localhost:9999/emails/batch");
  });

  it("recusa um lote maior que o limite do serviço", async () => {
    const { enviarLote, MAXIMO_POR_LOTE } = await carregar();
    const demais = Array.from({ length: MAXIMO_POR_LOTE + 1 }, () => mensagem());
    const resultado = await enviarLote(demais);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.erro).toContain(String(MAXIMO_POR_LOTE));
  });
});
