import { describe, expect, it } from "vitest";
import { escaparHtml, montarBoletim, quandoPorExtenso, type AtividadeNoEmail } from "./boletim";

const atividade = (ajustes: Partial<AtividadeNoEmail> = {}): AtividadeNoEmail => ({
  titulo: "Aula inaugural",
  tipo: "PALESTRA",
  dia: "2026-10-07",
  diaFinal: null,
  hora: "19:00",
  local: "Auditório da FFLCH",
  resumo: null,
  linkDeInscricao: null,
  ...ajustes,
});

const montar = (ajustes: Parameters<typeof montarBoletim>[0] extends infer T ? Partial<T> : never = {}) =>
  montarBoletim({
    assunto: "Boletim de outubro",
    corpo: "Olá!\n\nSegue o que vem pela frente.",
    atividades: [],
    destinatario: { nome: "Ana Braun", email: "ana@usp.br", chave: "chave-da-ana" },
    endereco: "https://cej.vercel.app",
    ...ajustes,
  });

describe("o esqueleto do e-mail", () => {
  it("sai nas duas versões, HTML e texto puro", () => {
    const { html, texto } = montar();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Boletim de outubro");
    expect(texto).toContain("Boletim de outubro");
    expect(texto).not.toContain("<");
  });

  it("não usa nada que e-mail antigo não entenda", () => {
    // Um flexbox ou uma folha de estilo externa não dão erro: desmontam a
    // mensagem na tela de metade das pessoas, em silêncio.
    const { html } = montar({ atividades: [atividade()] });
    expect(html).not.toMatch(/display:\s*flex/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
    expect(html).not.toContain("</style>");
    expect(html).toContain('role="presentation"');
  });
});

describe("o descadastro", () => {
  it("vai em toda mensagem, nas duas versões, com a chave da pessoa", () => {
    // Sem isto, o serviço de envio suspende a conta — e com razão.
    const { html, texto, linkDeDescadastro } = montar();
    expect(linkDeDescadastro).toBe("https://cej.vercel.app/descadastrar/chave-da-ana");
    expect(html).toContain(linkDeDescadastro);
    expect(texto).toContain(linkDeDescadastro);
  });

  it("diz por que a pessoa está recebendo aquilo", () => {
    const { html, texto } = montar();
    expect(html).toContain("Você recebe este boletim porque");
    expect(texto).toContain("Você recebe este boletim porque");
  });
});

describe("o texto escrito na caixa", () => {
  it("vira parágrafos, e a quebra simples vira quebra de linha", () => {
    const { html } = montar({ corpo: "Primeiro parágrafo.\n\nSegundo.\nMesmo parágrafo." });
    expect((html.match(/<p style=/g) ?? [])).toHaveLength(2);
    expect(html).toContain("Segundo.<br>Mesmo parágrafo.");
  });

  it("escapa o que quebraria o HTML — o & de 'Memória & Exílio'", () => {
    const { html } = montar({ assunto: "Memória & Exílio", corpo: "Um <script>." });
    expect(html).toContain("Memória &amp; Exílio");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("escapa também dentro da atividade", () => {
    const { html } = montar({ atividades: [atividade({ titulo: "Arte & memória" })] });
    expect(html).toContain("Arte &amp; memória");
  });
});

describe("as atividades dentro do boletim", () => {
  it("entram com tipo, data por extenso e local", () => {
    const { html, texto } = montar({ atividades: [atividade()] });
    expect(html).toContain("Palestra");
    expect(html).toContain("Quarta, 7 de outubro, às 19:00");
    expect(html).toContain("Auditório da FFLCH");
    expect(texto).toContain("Palestra: Aula inaugural");
  });

  it("dizem 'próxima atividade' no singular quando é uma só", () => {
    expect(montar({ atividades: [atividade()] }).html).toContain("Próxima atividade");
    expect(montar({ atividades: [atividade(), atividade()] }).html).toContain("Próximas atividades");
  });

  it("não aparecem de jeito nenhum quando não há nenhuma", () => {
    const { html, texto } = montar({ atividades: [] });
    expect(html).not.toContain("Próxima");
    expect(texto).not.toContain("PRÓXIMA");
  });

  it("mostram o botão de inscrição só quando há link", () => {
    expect(montar({ atividades: [atividade()] }).html).not.toContain("Inscrever-se");
    const com = montar({
      atividades: [atividade({ linkDeInscricao: "https://cej.vercel.app/inscricao/abc" })],
    });
    expect(com.html).toContain("Inscrever-se");
    expect(com.texto).toContain("Inscrições: https://cej.vercel.app/inscricao/abc");
  });
});

describe("como a data é dita no e-mail", () => {
  it("um dia, com hora", () => {
    expect(quandoPorExtenso(atividade())).toBe("Quarta, 7 de outubro, às 19:00");
  });

  it("um dia, sem hora", () => {
    expect(quandoPorExtenso(atividade({ hora: null }))).toBe("Quarta, 7 de outubro");
  });

  it("vários dias", () => {
    expect(quandoPorExtenso(atividade({ diaFinal: "2026-10-09", hora: null }))).toBe(
      "De 7 de outubro de 2026 a 9 de outubro de 2026",
    );
  });
});

describe("escapar", () => {
  it("cuida dos quatro que importam", () => {
    expect(escaparHtml('& < > "')).toBe("&amp; &lt; &gt; &quot;");
  });
});
