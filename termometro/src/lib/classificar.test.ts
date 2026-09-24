import { describe, expect, it } from "vitest";
import { aClassificar, quantosSemCategoria } from "./classificar";
import type { Lancamento, Tipo } from "./tipos";

let n = 0;
const l = (
  tipo: Tipo,
  reais: number,
  nota: string | null,
  categoria: string | null = null,
): Lancamento => ({
  id: `id-${++n}`,
  data: "2026-09-01",
  tipo,
  valorCents: reais * 100,
  nota,
  categoria,
});

describe("o que falta classificar", () => {
  /**
   * É o caso que esta função existe para resolver: a planilha repetia "aluguel"
   * doze vezes, e quem diz "aluguel" uma vez está dizendo das doze.
   */
  it("junta por nota, para uma decisão valer por muitos lançamentos", () => {
    const grupos = aClassificar([
      l("SAIDA", 2261, "aluguel"),
      l("SAIDA", 2261, "aluguel"),
      l("SAIDA", 2261, "aluguel"),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ nota: "aluguel", quantos: 3, totalCents: 678300 });
    expect(grupos[0].ids).toHaveLength(3);
  });

  it("não se importa com maiúscula nem com espaço sobrando", () => {
    const grupos = aClassificar([l("SAIDA", 10, "Aluguel"), l("SAIDA", 10, " aluguel ")]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].nota).toBe("Aluguel");
  });

  it("tipos diferentes não se misturam, porque as categorias também não", () => {
    const grupos = aClassificar([l("SAIDA", 10, "pix"), l("ENTRADA", 10, "pix")]);
    expect(grupos).toHaveLength(2);
  });

  it("quem não tem nota também forma grupo, em vez de ficar de fora", () => {
    const grupos = aClassificar([l("DIARIO", 60, null), l("DIARIO", 40, "")]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toMatchObject({ nota: null, quantos: 2 });
  });

  it("do maior para o menor em dinheiro, que é por onde vale começar", () => {
    const grupos = aClassificar([
      l("DIARIO", 10, "café"),
      l("SAIDA", 5000, "fatura"),
      l("DIARIO", 300, "mercado"),
    ]);
    expect(grupos.map((g) => g.nota)).toEqual(["fatura", "mercado", "café"]);
  });

  it("quem já tem categoria não aparece", () => {
    const grupos = aClassificar([l("SAIDA", 10, "luz", "contas"), l("SAIDA", 10, "água")]);
    expect(grupos.map((g) => g.nota)).toEqual(["água"]);
  });

  it("apagado não aparece", () => {
    const grupos = aClassificar([{ ...l("SAIDA", 999, "sumiu"), apagadoEm: "x" }]);
    expect(grupos).toEqual([]);
  });

  it("conta quantos ainda faltam, para a tela saber se tem o que fazer", () => {
    expect(quantosSemCategoria([l("SAIDA", 10, "a"), l("SAIDA", 10, "b", "contas")])).toBe(1);
    expect(quantosSemCategoria([])).toBe(0);
  });
});
