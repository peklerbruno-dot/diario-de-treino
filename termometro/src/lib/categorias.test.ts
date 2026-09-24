import { describe, expect, it } from "vitest";
import {
  acharCategoria,
  CATEGORIAS_PADRAO,
  categoriasDoTipo,
  escreverCategorias,
  idDoNome,
  lerCategorias,
  nomeDaCategoria,
  SEM_CATEGORIA,
  type Categoria,
} from "./categorias";

const lista: Categoria[] = [
  { id: "mercado", nome: "Mercado", tipos: ["DIARIO", "SAIDA"] },
  { id: "salario", nome: "Salário", tipos: ["ENTRADA"] },
];

describe("a lista de categorias", () => {
  it("sem nada guardado, começa com a lista padrão", () => {
    expect(lerCategorias(undefined)).toBe(CATEGORIAS_PADRAO);
    expect(lerCategorias("")).toBe(CATEGORIAS_PADRAO);
  });

  it("vai e volta pelo texto que é guardado nos ajustes", () => {
    expect(lerCategorias(escreverCategorias(lista))).toEqual(lista);
  });

  /**
   * A lista sincroniza entre aparelhos e cabe num campo de texto: um dia ela
   * volta cortada ou com lixo dentro. Derrubar a tela por causa disso deixaria
   * a pessoa sem app; a lista padrão deixa ela lançando.
   */
  it("texto quebrado não derruba a tela, cai no padrão", () => {
    expect(lerCategorias("{isto não é json")).toBe(CATEGORIAS_PADRAO);
    expect(lerCategorias('"nem isto"')).toBe(CATEGORIAS_PADRAO);
    expect(lerCategorias("[]")).toBe(CATEGORIAS_PADRAO);
  });

  it("descarta as entradas tortas e fica com as boas", () => {
    const misturado = JSON.stringify([
      ...lista,
      { id: "", nome: "vazio", tipos: ["SAIDA"] },
      null,
      7,
    ]);
    expect(lerCategorias(misturado)).toEqual(lista);
  });

  it("uma categoria vale em mais de uma coluna", () => {
    expect(categoriasDoTipo(lista, "DIARIO").map((c) => c.id)).toEqual(["mercado"]);
    expect(categoriasDoTipo(lista, "SAIDA").map((c) => c.id)).toEqual(["mercado"]);
    expect(categoriasDoTipo(lista, "ENTRADA").map((c) => c.id)).toEqual(["salario"]);
  });
});

describe("o nome de uma categoria", () => {
  it("é o nome cadastrado", () => {
    expect(nomeDaCategoria(lista, "mercado")).toBe("Mercado");
  });

  it("lançamento sem categoria tem nome próprio, para aparecer nos totais", () => {
    expect(nomeDaCategoria(lista, null)).toBe(SEM_CATEGORIA);
    expect(nomeDaCategoria(lista, undefined)).toBe(SEM_CATEGORIA);
  });

  /** Apagar uma categoria não pode apagar o passado dela. */
  it("categoria apagada continua nomeando os lançamentos antigos", () => {
    expect(nomeDaCategoria(lista, "farmacia")).toBe("farmacia");
  });
});

describe("o id que nasce do nome", () => {
  it("tira acento, espaço e maiúscula", () => {
    expect(idDoNome("Saúde")).toBe("saude");
    expect(idDoNome("Conta de Luz")).toBe("conta-de-luz");
    expect(idDoNome("  Lazer  ")).toBe("lazer");
  });

  it("nunca devolve vazio, que não daria para guardar", () => {
    expect(idDoNome("???")).toBe("categoria");
    expect(idDoNome("")).toBe("categoria");
  });
});

describe("achar a categoria que a Siri ouviu", () => {
  const todas: Categoria[] = [
    { id: "mercado", nome: "Mercado", tipos: ["DIARIO"] },
    { id: "contas", nome: "Contas", tipos: ["SAIDA"] },
    { id: "saude", nome: "Saúde", tipos: ["DIARIO", "SAIDA"] },
    { id: "transporte-diario", nome: "Transporte", tipos: ["DIARIO"] },
  ];

  it("acha pelo nome exato", () => {
    expect(acharCategoria(todas, "Mercado", "DIARIO")?.id).toBe("mercado");
  });

  it("não se importa com maiúscula nem com acento, que o ditado come", () => {
    expect(acharCategoria(todas, "saude", "DIARIO")?.id).toBe("saude");
    expect(acharCategoria(todas, "SAÚDE", "DIARIO")?.id).toBe("saude");
    expect(acharCategoria(todas, "  mercado  ", "DIARIO")?.id).toBe("mercado");
  });

  it("aceita o começo e o que contém, porque a fala não é exata", () => {
    expect(acharCategoria(todas, "merc", "DIARIO")?.id).toBe("mercado");
    expect(acharCategoria(todas, "conta de luz", "SAIDA")?.id).toBe("contas");
  });

  it("prefere a categoria da coluna pedida", () => {
    expect(acharCategoria(todas, "transporte", "DIARIO")?.id).toBe("transporte-diario");
  });

  /**
   * Guardar com a coluna trocada é melhor do que guardar sem categoria: o valor
   * entra, aparece nos totais, e se conserta em dois toques.
   */
  it("aceita categoria de outra coluna em vez de desistir", () => {
    expect(acharCategoria(todas, "contas", "DIARIO")?.id).toBe("contas");
  });

  it("não inventa categoria quando não há parecida", () => {
    expect(acharCategoria(todas, "jiu-jitsu", "DIARIO")).toBeNull();
    expect(acharCategoria(todas, "", "DIARIO")).toBeNull();
    expect(acharCategoria(todas, "   ", "DIARIO")).toBeNull();
  });
});
