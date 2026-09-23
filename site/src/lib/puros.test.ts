import { describe, expect, it } from "vitest";
import { arrobaInstagram, linkInstagram, linkWhatsapp, normalizarLink } from "./links";
import { dataPorExtenso, hojeEmSaoPaulo, horaLegivel, proximoSabado, seloData } from "./datas";
import { formatarTexto } from "./texto";
import { limparDados } from "./validar";
import { BLOCOS, COLECOES } from "./esquema";
import { BLOCOS_PADRAO, itensIniciais } from "./padrao";

describe("links", () => {
  it("aceita o jeito que a equipe escreve", () => {
    expect(normalizarLink("chazit.org.br/agenda")).toBe("https://chazit.org.br/agenda");
    expect(normalizarLink("/contato")).toBe("/contato");
    expect(normalizarLink("https://forms.gle/abc")).toBe("https://forms.gle/abc");
    expect(normalizarLink("oi@chazit.org.br")).toBe("mailto:oi@chazit.org.br");
  });
  it("recusa o que não é link", () => {
    expect(normalizarLink("javascript:alert(1)")).toBe("");
    expect(normalizarLink("//malicioso.com")).toBe("");
    expect(normalizarLink("clique aqui")).toBe("");
  });
  it("monta o WhatsApp com DDI do Brasil", () => {
    expect(linkWhatsapp("(11) 99999-8888")).toBe("https://wa.me/5511999998888");
    expect(linkWhatsapp("+55 11 99999-8888")).toBe("https://wa.me/5511999998888");
    expect(linkWhatsapp("123")).toBe("");
  });
  it("entende o Instagram com @, sem @ ou pelo endereço", () => {
    expect(linkInstagram("@chazitsp")).toBe("https://www.instagram.com/chazitsp/");
    expect(linkInstagram("https://instagram.com/chazitsp?igsh=x")).toBe("https://www.instagram.com/chazitsp/");
    expect(arrobaInstagram("chazitsp")).toBe("@chazitsp");
    expect(linkInstagram("não é perfil")).toBe("");
  });
});

describe("datas", () => {
  it("escreve por extenso sem escorregar de dia", () => {
    expect(dataPorExtenso("2026-10-03")).toBe("sábado, 3 de outubro de 2026");
    expect(seloData("2026-10-03")).toEqual({ dia: "3", mes: "out", semana: "sábado" });
  });
  it("hoje é o dia de São Paulo, não o do servidor", () => {
    // 1h da manhã em UTC do dia 4 ainda é dia 3 em São Paulo.
    expect(hojeEmSaoPaulo(new Date("2026-10-04T01:00:00Z"))).toBe("2026-10-03");
  });
  it("acha o próximo sábado", () => {
    expect(proximoSabado("2026-09-23")).toBe("2026-09-26");
    expect(proximoSabado("2026-09-26")).toBe("2026-09-26");
  });
  it("hora legível", () => {
    expect(horaLegivel("14:00")).toBe("14h");
    expect(horaLegivel("09:30")).toBe("9h30");
  });
});

describe("texto", () => {
  it("separa parágrafos, linhas, negrito e links", () => {
    const t = formatarTexto("Oi **Chazit**\nveja www.chazit.org.br.\n\nSegundo");
    expect(t).toHaveLength(2);
    expect(t[0]![0]).toEqual([
      { tipo: "texto", valor: "Oi " },
      { tipo: "negrito", valor: "Chazit" },
    ]);
    expect(t[0]![1]).toContainEqual({ tipo: "link", valor: "www.chazit.org.br", href: "https://www.chazit.org.br" });
  });
});

describe("validação", () => {
  it("exige o obrigatório e arruma o link", () => {
    const campos = COLECOES.evento.campos;
    expect(limparDados(campos, { data: "2026-10-03" })).toEqual({ ok: false, erro: 'Preencha "Nome da atividade".' });
    const r = limparDados(campos, { titulo: " Peulá ", data: "2026-10-03", linkInscricao: "forms.gle/x", intruso: "x" });
    expect(r.ok && r.dados.titulo).toBe("Peulá");
    expect(r.ok && r.dados.linkInscricao).toBe("https://forms.gle/x");
    expect(r.ok && "intruso" in r.dados).toBe(false);
  });
  it("recusa data inválida e link perigoso", () => {
    expect(limparDados(COLECOES.evento.campos, { titulo: "x", data: "2026-02-31" }).ok).toBe(false);
    expect(limparDados(BLOCOS["site.aviso"].campos, { texto: "x", link: "javascript:alert(1)" }).ok).toBe(false);
  });
});

describe("conteúdo inicial", () => {
  it("todo bloco tem padrão e todo padrão passa na validação", () => {
    for (const [chave, bloco] of Object.entries(BLOCOS)) {
      const r = limparDados(bloco.campos, BLOCOS_PADRAO[chave as keyof typeof BLOCOS]);
      expect(r.ok, chave).toBe(true);
    }
    for (const it of itensIniciais("2026-09-23")) {
      expect(limparDados(COLECOES[it.tipo].campos, it.dados).ok, it.tipo).toBe(true);
    }
  });
});
