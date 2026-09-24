import { describe, expect, it } from "vitest";
import {
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
