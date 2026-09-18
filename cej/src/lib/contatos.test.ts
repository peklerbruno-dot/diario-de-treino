import { describe, expect, it } from "vitest";
import {
  arrumarNome, arrumarTelefone, comoVinculo, normalizarEmail, pareceEmail, podeReceber,
} from "./contatos";

describe("e-mail", () => {
  it("baixa a caixa e tira o espaço — é o que impede a pessoa duplicada", () => {
    expect(normalizarEmail("  Ana@USP.br ")).toBe("ana@usp.br");
    expect(normalizarEmail("")).toBeNull();
    expect(normalizarEmail(null)).toBeNull();
  });

  it("recusa o que a planilha traz no lugar de um e-mail", () => {
    expect(pareceEmail("ana@usp.br")).toBe(true);
    expect(pareceEmail("ana.braun@fflch.usp.br")).toBe(true);
    expect(pareceEmail("não tem")).toBe(false);
    expect(pareceEmail("ana@usp")).toBe(false);
    expect(pareceEmail("ana usp.br")).toBe(false);
    expect(pareceEmail("ana@usp.br, davi@usp.br")).toBe(false);
    expect(pareceEmail("")).toBe(false);
  });
});

describe("nome", () => {
  it("arruma o que veio todo em maiúsculas ou todo em minúsculas", () => {
    expect(arrumarNome("ANA BRAUN")).toBe("Ana Braun");
    expect(arrumarNome("  ana   braun ")).toBe("Ana Braun");
  });

  it("deixa as preposições minúsculas, como se escreve", () => {
    expect(arrumarNome("ANA DE SOUZA BRAUN")).toBe("Ana de Souza Braun");
    expect(arrumarNome("joão dos santos")).toBe("João dos Santos");
  });

  it("não mexe num nome que já foi digitado com cuidado", () => {
    // Quem escreveu "d'Ávila" e "McGrath" sabia o que estava fazendo.
    expect(arrumarNome("Ana d'Ávila")).toBe("Ana d'Ávila");
    expect(arrumarNome("Paul McGrath")).toBe("Paul McGrath");
  });

  it("aguenta vazio", () => {
    expect(arrumarNome("")).toBe("");
    expect(arrumarNome(null)).toBe("");
  });
});

describe("telefone", () => {
  it("formata celular e fixo, e tira o código do país", () => {
    expect(arrumarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(arrumarTelefone("+55 (11) 3091-1000")).toBe("(11) 3091-1000");
    expect(arrumarTelefone("5511987654321")).toBe("(11) 98765-4321");
  });

  it("não inventa nada com o que não é telefone", () => {
    expect(arrumarTelefone("não tem")).toBeNull();
    expect(arrumarTelefone("123")).toBeNull();
    expect(arrumarTelefone(null)).toBeNull();
  });
});

describe("quem pode receber um boletim", () => {
  const base = { estado: "ATIVO" as const, consentimentoEm: new Date(), apagadoEm: null };

  it("precisa das três coisas: ativo, consentido e não apagado", () => {
    expect(podeReceber(base)).toBe(true);
    expect(podeReceber({ ...base, estado: "DESCADASTRADO" })).toBe(false);
    expect(podeReceber({ ...base, estado: "INVALIDO" })).toBe(false);
    expect(podeReceber({ ...base, apagadoEm: new Date() })).toBe(false);
  });

  it("sem consentimento registrado, não recebe — mesmo estando ativo", () => {
    // É a condição que se esquece, e é a que derruba a conta de envio.
    expect(podeReceber({ ...base, consentimentoEm: null })).toBe(false);
  });
});

describe("vínculo vindo da planilha", () => {
  it("entende como as pessoas escrevem", () => {
    expect(comoVinculo("graduação")).toBe("GRADUACAO");
    expect(comoVinculo("Mestrado")).toBe("POS_GRADUACAO");
    expect(comoVinculo("doutoranda")).toBe("OUTRO"); // não está na lista, e tudo bem
    expect(comoVinculo("Professor")).toBe("DOCENTE");
    expect(comoVinculo("comunidade externa")).toBe("COMUNIDADE_EXTERNA");
    expect(comoVinculo("jornalista")).toBe("IMPRENSA");
  });

  it("aceita o próprio código do banco, que é como o formulário manda", () => {
    expect(comoVinculo("POS_GRADUACAO")).toBe("POS_GRADUACAO");
  });

  it("no que não reconhece, cai em OUTRO em vez de recusar a linha", () => {
    expect(comoVinculo("sei lá")).toBe("OUTRO");
    expect(comoVinculo("")).toBe("OUTRO");
    expect(comoVinculo(null)).toBe("OUTRO");
  });
});
