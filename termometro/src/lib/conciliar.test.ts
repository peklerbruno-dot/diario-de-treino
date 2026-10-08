import { describe, expect, it } from "vitest";
import { confirmadoCom, previstoParaConfirmar } from "./conciliar";
import type { Lancamento } from "./tipos";

const prev = (o: Partial<Lancamento>): Lancamento => ({
  id: "p1",
  data: "2026-10-05",
  tipo: "ENTRADA",
  valorCents: 500_000,
  nota: "Salário",
  previsto: true,
  fixoId: "f1",
  ...o,
});

describe("previstoParaConfirmar", () => {
  it("o salário que caiu confirma o salário previsto", () => {
    const achado = previstoParaConfirmar(
      { tipo: "ENTRADA", data: "2026-10-05", valorCents: 500_000 },
      [prev({})],
    );
    expect(achado?.id).toBe("p1");
  });

  it("aceita cair alguns dias antes ou depois, e valor um pouco diferente", () => {
    const novo = { tipo: "ENTRADA" as const, data: "2026-10-03", valorCents: 512_000 };
    expect(previstoParaConfirmar(novo, [prev({})])?.id).toBe("p1");
    expect(
      previstoParaConfirmar({ ...novo, data: "2026-10-11" }, [prev({})])?.id,
    ).toBe("p1");
  });

  it("um Pix pequeno de um amigo não confirma o salário", () => {
    expect(
      previstoParaConfirmar({ tipo: "ENTRADA", data: "2026-10-05", valorCents: 1_000 }, [prev({})]),
    ).toBeNull();
  });

  it("fora da janela de dias, não", () => {
    expect(
      previstoParaConfirmar({ tipo: "ENTRADA", data: "2026-10-14", valorCents: 500_000 }, [prev({})]),
    ).toBeNull();
  });

  it("só olha o mesmo tipo", () => {
    expect(
      previstoParaConfirmar({ tipo: "SAIDA", data: "2026-10-05", valorCents: 500_000 }, [prev({})]),
    ).toBeNull();
  });

  it("gasto do diário nunca confirma previsto", () => {
    expect(
      previstoParaConfirmar(
        { tipo: "DIARIO", data: "2026-10-05", valorCents: 6_000 },
        [prev({ tipo: "DIARIO", valorCents: 6_000 })],
      ),
    ).toBeNull();
  });

  it("ignora apagado, já confirmado e o que não nasceu de um fixo", () => {
    const novo = { tipo: "ENTRADA" as const, data: "2026-10-05", valorCents: 500_000 };
    expect(previstoParaConfirmar(novo, [prev({ apagadoEm: "2026-10-01T00:00:00Z" })])).toBeNull();
    expect(previstoParaConfirmar(novo, [prev({ previsto: false })])).toBeNull();
    expect(previstoParaConfirmar(novo, [prev({ fixoId: null })])).toBeNull();
  });

  it("entre dois candidatos, o mais perto no calendário", () => {
    const longe = prev({ id: "longe", data: "2026-10-01" });
    const perto = prev({ id: "perto", data: "2026-10-04" });
    expect(
      previstoParaConfirmar({ tipo: "ENTRADA", data: "2026-10-05", valorCents: 500_000 }, [longe, perto])?.id,
    ).toBe("perto");
  });
});

describe("confirmadoCom", () => {
  it("troca data e valor e mantém nota, categoria e fixo", () => {
    const l = confirmadoCom(
      prev({ categoria: "salario", rendaPropria: true }),
      { data: "2026-10-03", valorCents: 498_000 },
      "2026-10-03T12:00:00Z",
    );
    expect(l).toMatchObject({
      data: "2026-10-03",
      valorCents: 498_000,
      previsto: false,
      nota: "Salário",
      categoria: "salario",
      rendaPropria: true,
      fixoId: "f1",
    });
  });
});
