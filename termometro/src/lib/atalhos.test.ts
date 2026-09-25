import { describe, expect, it } from "vitest";
import {
  ATALHOS_PADRAO,
  escreverAtalhos,
  idParaAtalho,
  lerAtalhos,
  partidaDoAtalho,
  type AtalhoFixo,
} from "./atalhos";

const almoco: AtalhoFixo = {
  id: "almoco-fflch",
  titulo: "Almoço FFLCH",
  categoriaId: "comida",
  tipo: "DIARIO",
  observacaoPadrao: "Bandejão",
  valorPadraoCents: 1000,
};

describe("a lista de atalhos", () => {
  it("sem nada guardado, começa com os palpites", () => {
    expect(lerAtalhos(undefined)).toEqual(ATALHOS_PADRAO);
  });

  it("apagar todos deixa a fileira vazia, e ela fica vazia", () => {
    // O contrário das categorias, e de propósito: quem apagou os três botões
    // não quer os três de volta na próxima abertura.
    expect(lerAtalhos("[]")).toEqual([]);
  });

  it("lê de volta o que escreveu", () => {
    expect(lerAtalhos(escreverAtalhos([almoco]))).toEqual([almoco]);
  });

  it("texto quebrado não derruba a tela Hoje", () => {
    expect(lerAtalhos("{ isto não é json")).toEqual(ATALHOS_PADRAO);
    expect(lerAtalhos('"um texto solto"')).toEqual(ATALHOS_PADRAO);
  });

  it("descarta a linha sem título, sem tipo ou com tipo inventado", () => {
    const bruto = JSON.stringify([
      almoco,
      { id: "x", titulo: "   ", tipo: "DIARIO", categoriaId: null, valorPadraoCents: null },
      { id: "y", titulo: "Café", tipo: "MERENDA", categoriaId: null, valorPadraoCents: null },
      { titulo: "Sem id", tipo: "DIARIO", categoriaId: null, valorPadraoCents: null },
    ]);
    expect(lerAtalhos(bruto)).toEqual([almoco]);
  });
});

describe("o id de um atalho novo", () => {
  it("vem do título, sem acento e sem espaço", () => {
    expect(idParaAtalho([], "Almoço FFLCH")).toBe("almoco-fflch");
  });

  it("um título só de símbolos ainda dá um id", () => {
    expect(idParaAtalho([], "☕️")).toBe("atalho");
  });

  it("dois botões com o mesmo nome não brigam pelo mesmo id", () => {
    const um = idParaAtalho([], "Almoço");
    const dois = idParaAtalho([{ ...almoco, id: um }], "Almoço");
    const tres = idParaAtalho(
      [
        { ...almoco, id: um },
        { ...almoco, id: dois },
      ],
      "Almoço",
    );
    expect([um, dois, tres]).toEqual(["almoco", "almoco-2", "almoco-3"]);
  });
});

describe("o que o atalho preenche na folha", () => {
  it("leva a coluna, a categoria, a observação e o valor", () => {
    expect(partidaDoAtalho(almoco)).toEqual({
      tipo: "DIARIO",
      categoria: "comida",
      nota: "Bandejão",
      valorCents: 1000,
    });
  });

  it("sem valor sugerido, o campo fica em branco para ser digitado", () => {
    expect(partidaDoAtalho({ ...almoco, valorPadraoCents: null }).valorCents).toBeNull();
  });

  it("um valor de zero é o mesmo que não sugerir nada", () => {
    // Um campo mostrando 0,00 convida a salvar um lançamento de zero real.
    expect(partidaDoAtalho({ ...almoco, valorPadraoCents: 0 }).valorCents).toBeNull();
  });
});
