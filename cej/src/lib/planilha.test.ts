import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { aproveitaveis, lerPlanilha } from "./planilha";

/** Monta uma planilha de mentira, como as de verdade costumam ser. */
function planilha(grade: (string | number)[][]): Buffer {
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet(grade), "Contatos");
  return XLSX.write(livro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("achar o cabeçalho", () => {
  it("na primeira linha, quando é onde ele está", () => {
    const leitura = lerPlanilha(planilha([
      ["Nome", "E-mail"],
      ["Ana Braun", "ana@usp.br"],
    ]));
    expect(leitura.linhas).toHaveLength(1);
    expect(leitura.linhas[0].nome).toBe("Ana Braun");
  });

  it("mais abaixo, quando a planilha tem título e linha em branco antes", () => {
    // É o formato da planilha de equipe de verdade, e sozinho ele já faria
    // uma importação ingênua ler "Contatos do Centro" como se fosse um nome.
    const leitura = lerPlanilha(planilha([
      ["Contatos do Centro — 2025"],
      [],
      ["Nome completo", "E-Mail ", "Telefone"],
      ["ANA BRAUN", "ANA@USP.BR", "11987654321"],
    ]));
    expect(leitura.linhas).toHaveLength(1);
    expect(leitura.linhas[0]).toMatchObject({
      nome: "Ana Braun",
      email: "ana@usp.br",
      telefone: "(11) 98765-4321",
    });
  });
});

describe("reconhecer as colunas", () => {
  it("aceita os nomes que as pessoas usam, com acento e pontuação", () => {
    const leitura = lerPlanilha(planilha([
      ["nome", "e-mail", "celular", "vínculo", "Instituição", "tags", "obs"],
      ["Davi Stern", "davi@usp.br", "1130911000", "Professor", "USP", "hebraico; imprensa", "veio pelo curso"],
    ]));
    expect(leitura.colunas.map((c) => c.campo)).toEqual([
      "Nome", "E-mail", "Telefone", "Vínculo", "Instituição", "Etiquetas", "Observação",
    ]);
    expect(leitura.linhas[0]).toMatchObject({
      vinculo: "DOCENTE",
      instituicao: "USP",
      etiquetas: ["hebraico", "imprensa"],
      observacao: "veio pelo curso",
    });
  });

  it("prefere o e-mail institucional quando a planilha tem os dois", () => {
    // Sem essa ordem, ganharia a coluna mais à esquerda — que é sempre a errada.
    const leitura = lerPlanilha(planilha([
      ["Nome", "E-mail", "E-mail institucional"],
      ["Ana", "ana.pessoal@gmail.com", "ana@usp.br"],
    ]));
    expect(leitura.linhas[0].email).toBe("ana@usp.br");
  });

  it("diz quais colunas ela não soube ler, em vez de engoli-las", () => {
    const leitura = lerPlanilha(planilha([
      ["Nome", "E-mail", "Pagou?", "RG"],
      ["Ana", "ana@usp.br", "sim", "12345"],
    ]));
    expect(leitura.naoReconhecidas).toEqual(["Pagou?", "RG"]);
  });
});

describe("apontar os problemas sem recusar a planilha inteira", () => {
  it("marca cada linha pelo que há de errado com ela", () => {
    const leitura = lerPlanilha(planilha([
      ["Nome", "E-mail"],
      ["Ana Braun", "ana@usp.br"],
      ["Davi Stern", "não tem"],
      ["Miriam Cohn", ""],
      ["Ana Braun de novo", "ANA@usp.br"],
    ]));
    expect(leitura.linhas.map((l) => l.problema)).toEqual([
      null, "EMAIL_INVALIDO", "SEM_EMAIL", "REPETIDO_NA_PLANILHA",
    ]);
    expect(aproveitaveis(leitura)).toHaveLength(1);
  });

  it("aponta a linha pelo número que aparece no Excel", () => {
    const leitura = lerPlanilha(planilha([
      ["Contatos"],
      ["Nome", "E-mail"],
      ["Ana", "ana@usp.br"],
      ["Davi", "davi"],
    ]));
    // "Davi" está na quarta linha da planilha, e é esse número que a pessoa procura.
    expect(leitura.linhas[1].linha).toBe(4);
  });

  it("descarta lixo de planilha em silêncio, mas nunca um contato", () => {
    const leitura = lerPlanilha(planilha([
      ["Nome", "E-mail"],
      ["Ana", "ana@usp.br"],
      ["", ""],
      ["Davi", ""],
    ]));
    // A linha vazia some; a do Davi, que tem nome, vira um problema a resolver.
    expect(leitura.linhas).toHaveLength(2);
    expect(leitura.linhas[1]).toMatchObject({ nome: "Davi", problema: "SEM_EMAIL" });
  });
});

describe("planilhas que não dá para ler", () => {
  it("devolve vazio em vez de quebrar", () => {
    expect(lerPlanilha(planilha([])).linhas).toEqual([]);
    expect(lerPlanilha(planilha([["oi"], ["tudo bem"]])).linhas).toEqual([]);
  });
});

describe("CSV", () => {
  it("é lido do mesmo jeito — é o que sai do Google Sheets", () => {
    const csv = "Nome,E-mail,Vínculo\nAna Braun,ana@usp.br,Mestrado\n";
    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas[0]).toMatchObject({
      nome: "Ana Braun",
      email: "ana@usp.br",
      vinculo: "POS_GRADUACAO",
    });
  });

  it("guarda os acentos — lido como planilha binária, o nome da pessoa se quebra", () => {
    const csv = "Nome,E-mail\nJoão Gonçalves,joao@usp.br\n";
    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas[0].nome).toBe("João Gonçalves");
    expect(leitura.colunas.map((c) => c.campo)).toContain("Nome");
  });

  it("aceita o ponto e vírgula, que é como o Excel em português salva", () => {
    const csv = "Nome;E-mail;Instituição\nAna Braun;ana@usp.br;USP\n";
    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas[0]).toMatchObject({
      nome: "Ana Braun",
      email: "ana@usp.br",
      instituicao: "USP",
    });
  });

  it("acha o ponto e vírgula mesmo com um título solto na primeira linha", () => {
    // Adivinhar o separador pela primeira linha parece razoável e está errado:
    // a primeira linha de uma planilha de equipe costuma ser um título, sem
    // separador nenhum. O arquivo inteiro virava uma coluna só, e a importação
    // dizia "não achei contatos" sobre uma planilha perfeitamente boa.
    const csv = [
      "Contatos do Centro — lista de 2025",
      "",
      "Nome completo;E-mail;Vínculo",
      "ANA BRAUN;ANA@usp.br;Mestrado",
      "joão gonçalves;joao@usp.br;Professor",
    ].join("\n");

    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas).toHaveLength(2);
    expect(leitura.linhas[0]).toMatchObject({ nome: "Ana Braun", email: "ana@usp.br" });
    expect(leitura.linhas[1].nome).toBe("João Gonçalves");
  });

  it("e a vírgula, mesmo que um título tenha ponto e vírgula dentro", () => {
    const csv = [
      "Lista de 2025; atualizada em março",
      "Nome,E-mail",
      "Ana Braun,ana@usp.br",
      "Davi Stern,davi@usp.br",
    ].join("\n");

    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas).toHaveLength(2);
    expect(leitura.linhas[0].email).toBe("ana@usp.br");
  });

  it("aguenta o BOM que o Excel põe na frente do arquivo", () => {
    const csv = "\uFEFFNome,E-mail\nAna Braun,ana@usp.br\n";
    const leitura = lerPlanilha(Buffer.from(csv, "utf8"));
    expect(leitura.linhas).toHaveLength(1);
    expect(leitura.colunas.map((c) => c.campo)).toContain("Nome");
  });
});
