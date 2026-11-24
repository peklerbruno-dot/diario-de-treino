import { describe, expect, it } from "vitest";
import { reajustarPrevistos } from "./previsao-do-fixo";
import type { Fixo, Lancamento } from "./tipos";

const fixo = (o: Partial<Fixo> = {}): Fixo => ({
  id: "f1",
  tipo: "SAIDA",
  dia: 5,
  repeticao: null,
  valorCents: 200_000,
  nota: "Aluguel",
  categoria: "casa",
  ativo: true,
  ...o,
});

const prev = (data: string, o: Partial<Lancamento> = {}): Lancamento => ({
  id: `p-${data}`,
  data,
  tipo: "SAIDA",
  valorCents: 200_000,
  nota: "Aluguel",
  categoria: "casa",
  previsto: true,
  fixoId: "f1",
  ...o,
});

const base = {
  hoje: "2026-11-24",
  ate: "2027-12-31",
  agora: "2026-11-24T12:00:00Z",
};

describe("a previsão acompanha o fixo", () => {
  const lancamentos = [
    prev("2026-11-05", { previsto: false }), // já aconteceu
    prev("2026-12-05"),
    prev("2027-01-05"),
  ];

  it("valor novo vai para os previstos futuros, e só para eles", () => {
    const { salvar } = reajustarPrevistos({
      ...base,
      anterior: fixo(),
      novo: fixo({ valorCents: 220_000 }),
      lancamentos,
    });
    expect(salvar.map((l) => [l.data, l.valorCents])).toEqual([
      ["2026-12-05", 220_000],
      ["2027-01-05", 220_000],
    ]);
  });

  it("um previsto que a pessoa editou à mão fica como está", () => {
    const { salvar } = reajustarPrevistos({
      ...base,
      anterior: fixo(),
      novo: fixo({ valorCents: 220_000 }),
      lancamentos: [prev("2026-12-05", { valorCents: 190_000 }), prev("2027-01-05")],
    });
    expect(salvar.map((l) => l.data)).toEqual(["2027-01-05"]);
  });

  it("desligar o fixo tira os previstos futuros e os solta do fixo", () => {
    const { salvar } = reajustarPrevistos({
      ...base,
      anterior: fixo(),
      novo: fixo({ ativo: false }),
      lancamentos,
    });
    expect(salvar).toHaveLength(2);
    for (const l of salvar) {
      expect(l.apagadoEm).toBeTruthy();
      expect(l.fixoId).toBeNull();
    }
  });

  it("mudar o dia apaga os previstos futuros e escreve de novo no dia certo", () => {
    const { salvar } = reajustarPrevistos({
      ...base,
      anterior: fixo(),
      novo: fixo({ dia: 10, repeticao: "dia:10" }),
      lancamentos,
      novoId: (() => {
        let n = 0;
        return () => `novo-${++n}`;
      })(),
    });
    const apagados = salvar.filter((l) => l.apagadoEm);
    const novos = salvar.filter((l) => !l.apagadoEm);
    expect(apagados.map((l) => l.data)).toEqual(["2026-12-05", "2027-01-05"]);
    expect(novos.length).toBeGreaterThan(0);
    expect(novos.every((l) => l.data.endsWith("-10"))).toBe(true);
    expect(novos.every((l) => l.previsto && l.fixoId === "f1")).toBe(true);
  });

  it("fixo novo (sem anterior) não mexe em nada", () => {
    expect(
      reajustarPrevistos({ ...base, anterior: undefined, novo: fixo(), lancamentos }).salvar,
    ).toEqual([]);
  });
});
