/**
 * Testes do importador com uma planilha de mentira, montada aqui.
 *
 * A planilha de verdade tem dinheiro real dentro e não mora neste repositório;
 * a conferência contra ela está em `planilha-real.test.ts`, que só roda quando
 * alguém aponta o arquivo. Aqui ficam as regras, que é o que precisa continuar
 * valendo mesmo sem o arquivo à mão.
 */
import { describe, expect, it } from "vitest";
import { abasDeAno, letraDaColuna, lerPlanilha, parcelasDaFormula } from "./planilha";

type Celula = { t?: string; v?: unknown; f?: string; c?: { t?: string }[] };

/** Monta uma aba com os doze blocos de seis colunas, como a planilha de verdade. */
function abaDeAno(preencher: (por: (celula: string, conteudo: Celula) => void) => void) {
  const aba: Record<string, unknown> = { "!ref": "A1:BT50" };
  const por = (celula: string, conteudo: Celula) => {
    aba[celula] = conteudo;
  };

  const MESES = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
  ];
  for (let mes = 0; mes < 12; mes++) {
    const inicio = 1 + mes * 6; // coluna B, H, N…
    por(`${letraDaColuna(inicio)}1`, { t: "s", v: MESES[mes] });
    ["Data", "Entrada", "Saída", "Diário", "Saldo"].forEach((titulo, i) => {
      por(`${letraDaColuna(inicio + i)}2`, { t: "s", v: titulo });
    });
    for (let dia = 1; dia <= 31; dia++) {
      por(`${letraDaColuna(inicio)}${dia + 2}`, { t: "n", v: dia });
    }
  }

  preencher(por);
  return { SheetNames: ["2026"], Sheets: { "2026": aba } };
}

const numeros = (l: { valorCents: number }[]) => l.map((x) => x.valorCents);

describe("achar o que importar", () => {
  it("escolhe a aba de ano mais recente quando não pedem uma", () => {
    const pasta = { SheetNames: ["Economia", "2024", "2026", "Invest", "2025"], Sheets: {} };
    expect(abasDeAno(pasta)).toEqual(["2026", "2025", "2024"]);
  });

  it("reclama, em português, de uma planilha que não é esta", () => {
    expect(() => lerPlanilha({ SheetNames: ["Plan1"], Sheets: { Plan1: {} } })).toThrow(
      /aba com nome de ano/,
    );
    expect(() =>
      lerPlanilha({ SheetNames: ["2026"], Sheets: { "2026": { "!ref": "A1:C3" } } }),
    ).toThrow(/não parece o Termômetro/);
  });
});

describe("cada célula vira lançamento", () => {
  it("lê as três colunas do dia", () => {
    const pasta = abaDeAno((por) => {
      por("C16", { t: "n", v: 7065.9 });
      por("D4", { t: "n", v: 381.05 });
      por("E5", { t: "n", v: 56.44 });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(lancamentos).toHaveLength(3);
    expect(lancamentos.find((l) => l.tipo === "ENTRADA")).toMatchObject({
      data: "2026-01-14",
      valorCents: 706590,
    });
    expect(lancamentos.find((l) => l.tipo === "SAIDA")).toMatchObject({
      data: "2026-01-02",
      valorCents: 38105,
    });
    expect(lancamentos.find((l) => l.tipo === "DIARIO")).toMatchObject({
      data: "2026-01-03",
      valorCents: 5644,
    });
  });

  it("quebra a soma escrita na célula em um lançamento por parcela", () => {
    const pasta = abaDeAno((por) => {
      por("E4", { t: "n", v: 293, f: "195+15+83" });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(numeros(lancamentos)).toEqual([19500, 1500, 8300]);
    expect(lancamentos.every((l) => l.data === "2026-01-02")).toBe(true);
    expect(lancamentos[0].nota).toBeNull();
  });

  it("guarda a conta de verdade como nota, em vez de fingir que eram parcelas", () => {
    const pasta = abaDeAno((por) => {
      por("C11", { t: "n", v: 339.336, f: "D11*0.4" });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0].valorCents).toBe(33934); // arredondado ao centavo
    expect(lancamentos[0].nota).toBe("planilha: =D11*0.4");
  });

  it("traz o comentário da célula como nota", () => {
    const pasta = abaDeAno((por) => {
      por("D10", { t: "n", v: 942.16, c: [{ t: "pagamento fatura" }] });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(lancamentos[0].nota).toBe("pagamento fatura");
  });

  it("descola o comentário do aviso de versão que o Excel cola na frente", () => {
    const pasta = abaDeAno((por) => {
      por("D10", {
        t: "n",
        v: 100,
        c: [{ t: "[Threaded comment] Your version of Excel... Comment: seguro do carro" }],
      });
    });

    expect(lerPlanilha(pasta, { novoId: () => "x" }).lancamentos[0].nota).toBe("seguro do carro");
  });

  it("conserta o acento que vem estropiado do comentário", () => {
    const pasta = abaDeAno((por) => {
      // "peitacoringão" com os bytes de UTF-8 lidos um a um.
      por("D10", { t: "n", v: 100, c: [{ t: "peitacoringÃ£o" }] });
    });

    const nota = lerPlanilha(pasta, { novoId: () => "x" }).lancamentos[0].nota ?? "";
    expect(nota).toBe("peitacoringão");
  });

  it("pula célula vazia e célula zerada", () => {
    const pasta = abaDeAno((por) => {
      por("E14", { t: "n", v: 0 });
      por("E15", { t: "n", v: 17.91 });
    });
    expect(lerPlanilha(pasta, { novoId: () => "x" }).lancamentos).toHaveLength(1);
  });
});

describe("o dia que o mês não tem", () => {
  it("desce para o último dia e avisa", () => {
    const pasta = abaDeAno((por) => {
      // Coluna BL = saída de novembro, linha 33 = "dia 31".
      por("BL33", { t: "n", v: 8000 });
    });

    const { lancamentos, avisos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(lancamentos[0].data).toBe("2026-11-30");
    expect(avisos[0]).toContain("dia 31");
  });

  it("não inventa dia 29 de fevereiro num ano que não é bissexto", () => {
    const pasta = abaDeAno((por) => {
      por("K31", { t: "n", v: 10 }); // diário de fevereiro, "dia 29"
    });

    expect(lerPlanilha(pasta, { novoId: () => "x" }).lancamentos[0].data).toBe("2026-02-28");
  });
});

describe("as marcações escondidas no rodapé", () => {
  it("recupera quais entradas eram dinheiro seu", () => {
    const pasta = abaDeAno((por) => {
      por("C16", { t: "n", v: 7065.9 });
      por("C10", { t: "n", v: 1000 });
      por("C40", { t: "s", v: "ENTRADA S/ $PAI" });
      por("C41", { t: "n", v: 7065.9, f: "C16" });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    const salario = lancamentos.find((l) => l.valorCents === 706590);
    const resgate = lancamentos.find((l) => l.valorCents === 100000);
    expect(salario?.rendaPropria).toBe(true);
    expect(resgate?.rendaPropria).toBe(false);
  });

  it("recupera a saída que foi para investimento", () => {
    const pasta = abaDeAno((por) => {
      por("J29", { t: "n", v: 1000 });
      por("I43", { t: "s", v: "INVESTIDO %" });
      por("I44", { t: "n", v: 31.9, f: "(J29/I41)*100" });
    });

    expect(lerPlanilha(pasta, { novoId: () => "x" }).lancamentos[0].investimento).toBe(true);
  });

  it("recupera as saídas do apartamento", () => {
    const pasta = abaDeAno((por) => {
      por("AB29", { t: "n", v: 1200 });
      por("AB12", { t: "n", v: 800 });
      por("AB40", { t: "s", v: "Saídas Apto" });
      por("AB41", { t: "n", v: 4021.04, f: "AB29+AB12-1057" });
    });

    const { lancamentos } = lerPlanilha(pasta, { novoId: () => "x" });
    expect(lancamentos.every((l) => l.apartamento)).toBe(true);
  });

  it("não confunde 'Saída Total' com 'Saídas Apto'", () => {
    const pasta = abaDeAno((por) => {
      por("D10", { t: "n", v: 942.16 });
      por("E40", { t: "s", v: "Saída Total" });
      por("E41", { t: "n", v: 11021.75, f: "D38+E38" });
    });

    expect(lerPlanilha(pasta, { novoId: () => "x" }).lancamentos[0].apartamento).toBe(false);
  });
});

describe("o saldo com que o ano começa", () => {
  it("desfaz o movimento do dia 1º para achar a abertura", () => {
    const pasta = abaDeAno((por) => {
      por("E3", { t: "n", v: 100 }); // gastou 100 no dia 1º
      por("F3", { t: "n", v: 1923.56, f: "'2025'!BT33" }); // e terminou o dia assim
    });

    expect(lerPlanilha(pasta).saldoInicialCents).toBe(202356);
  });
});

describe("o que ainda não aconteceu", () => {
  it("entra como previsão quando a data é depois de hoje", () => {
    const pasta = abaDeAno((por) => {
      por("E5", { t: "n", v: 50 }); // 3 de janeiro
      por("BS5", { t: "n", v: 60 }); // 3 de dezembro
    });

    const { lancamentos } = lerPlanilha(pasta, { hoje: "2026-09-15", novoId: () => "x" });
    expect(lancamentos.find((l) => l.data === "2026-01-03")?.previsto).toBe(false);
    expect(lancamentos.find((l) => l.data === "2026-12-03")?.previsto).toBe(true);
  });
});

describe("parcelasDaFormula", () => {
  it.each([
    ["985.4+367.5+379+528", 2259.9, [985.4, 367.5, 379, 528]],
    ["19.12+45.8+59.98+18.99", 143.89, [19.12, 45.8, 59.98, 18.99]],
  ])("quebra a soma %s", (formula, valor, esperado) => {
    expect(parcelasDaFormula(formula, valor).valores).toEqual(esperado);
  });

  it.each([
    ["66.43+75.95-32.55", 109.83],
    ["11473-10000", 1473],
    ["D11*0.4", 339.336],
    ["SUM(E3:E33)/30", 87.36],
  ])("não quebra %s, que não é uma soma de números", (formula, valor) => {
    const { valores, formulaPreservada } = parcelasDaFormula(formula, valor);
    expect(valores).toEqual([valor]);
    expect(formulaPreservada).toBe(`=${formula}`);
  });

  it("não vira nota quando a fórmula é só um número", () => {
    expect(parcelasDaFormula("83.13", 83.13)).toEqual({
      valores: [83.13],
      formulaPreservada: null,
    });
  });
});
