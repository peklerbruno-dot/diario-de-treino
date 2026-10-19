import { describe, expect, it } from "vitest";
import { entenderAnotacao, lerData } from "./anotar";

const hoje = "2026-10-19"; // segunda-feira

describe("anotar", () => {
  it("tira a data do texto e entende o dia da semana", () => {
    expect(entenderAnotacao("mandar orçamento pro CEJ até quinta", hoje)).toEqual({ titulo: "Mandar orçamento pro CEJ", prazo: "2026-10-22" });
    expect(entenderAnotacao("ligar pra Nancy sexta-feira", hoje)).toEqual({ titulo: "Ligar pra Nancy", prazo: "2026-10-23" });
  });
  it("o mesmo dia da semana de hoje é o da semana que vem", () => {
    expect(entenderAnotacao("reunião na segunda", hoje).prazo).toBe("2026-10-26");
  });
  it("entende hoje, amanhã e depois de amanhã, com ou sem acento", () => {
    expect(entenderAnotacao("pagar boleto hoje", hoje)).toEqual({ titulo: "Pagar boleto", prazo: hoje });
    expect(entenderAnotacao("revisar texto amanha", hoje).prazo).toBe("2026-10-20");
    expect(entenderAnotacao("enviar parecer depois de amanhã", hoje)).toEqual({ titulo: "Enviar parecer", prazo: "2026-10-21" });
  });
  it("entende datas escritas", () => {
    expect(entenderAnotacao("entregar relatório até 25/10", hoje)).toEqual({ titulo: "Entregar relatório", prazo: "2026-10-25" });
    expect(entenderAnotacao("renovar passaporte 10/03", hoje).prazo).toBe("2027-03-10");
    expect(entenderAnotacao("inscrição dia 5", hoje).prazo).toBe("2026-11-05");
    expect(entenderAnotacao("inscrição dia 30", hoje).prazo).toBe("2026-10-30");
  });
  it("entende semana que vem e fim do mês", () => {
    expect(entenderAnotacao("ver bolsa semana que vem", hoje)).toEqual({ titulo: "Ver bolsa", prazo: "2026-10-26" });
    expect(entenderAnotacao("fechar contas até o fim do mês", hoje)).toEqual({ titulo: "Fechar contas", prazo: "2026-10-31" });
  });
  it("sem data, só põe a primeira letra em maiúscula", () => {
    expect(entenderAnotacao("atualizar o lattes", hoje)).toEqual({ titulo: "Atualizar o lattes", prazo: null });
  });
  it("não confunde palavra com data", () => {
    expect(entenderAnotacao("comprar sextante", hoje).prazo).toBeNull();
    expect(entenderAnotacao("ler o artigo de hojeiro", hoje).prazo).toBeNull();
  });
  it("lê a data que o atalho do iPhone manda, em qualquer formato", () => {
    expect(lerData("2026-10-22T00:00:00-03:00")).toBe("2026-10-22");
    expect(lerData("22/10/2026")).toBe("2026-10-22");
    expect(lerData("22 de out. de 2026 00:00")).toBe("2026-10-22");
    expect(lerData("22 de outubro de 2026")).toBe("2026-10-22");
    expect(lerData("Oct 22, 2026 at 12:00 AM")).toBe("2026-10-22");
    expect(lerData("segunda-feira, 19/10/2026 às 00:00")).toBe("2026-10-19");
    expect(lerData("segunda-feira, 19 de outubro de 2026 às 00:00")).toBe("2026-10-19");
    expect(lerData("amanhã")).toBeNull();
  });
});
