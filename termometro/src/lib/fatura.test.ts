import { describe, expect, it } from "vitest";
import {
  cicloDaCompra,
  escreverCartao,
  faturasDoCartao,
  lerCartao,
  planoDaFatura,
  type Cartao,
} from "./fatura";
import type { Lancamento } from "./tipos";

const nubank: Cartao = { fechaDia: 25, venceDia: 5 };

const compra = (
  id: string,
  data: string,
  valorCents: number,
  o: Partial<Lancamento> = {},
): Lancamento => ({
  id,
  data,
  tipo: "DIARIO",
  valorCents,
  credito: true,
  previsto: false,
  criadoEm: `${data}T12:00:00Z`,
  ...o,
});

describe("o cartão guardado", () => {
  it("ida e volta", () => {
    expect(lerCartao(escreverCartao(nubank))).toEqual(nubank);
  });
  it("texto estragado ou dia impossível é cartão não cadastrado", () => {
    expect(lerCartao(undefined)).toBeNull();
    expect(lerCartao("oi")).toBeNull();
    expect(lerCartao('{"fecha":40,"vence":5}')).toBeNull();
  });
});

describe("de qual fatura é a compra", () => {
  it("antes do fechamento: a fatura que fecha neste mês e vence no mês seguinte", () => {
    expect(cicloDaCompra("2026-10-10", nubank)).toEqual({
      id: "2026-10",
      fechamento: "2026-10-25",
      vencimento: "2026-11-05",
    });
  });

  it("no dia do fechamento já é da fatura seguinte", () => {
    expect(cicloDaCompra("2026-10-25", nubank).id).toBe("2026-11");
    expect(cicloDaCompra("2026-10-24", nubank).id).toBe("2026-10");
  });

  it("vencimento depois do fechamento cai no mesmo mês", () => {
    const c = cicloDaCompra("2026-10-03", { fechaDia: 5, venceDia: 12 });
    expect(c).toEqual({ id: "2026-10", fechamento: "2026-10-05", vencimento: "2026-10-12" });
  });

  it("vira o ano", () => {
    expect(cicloDaCompra("2026-12-28", nubank)).toEqual({
      id: "2027-01",
      fechamento: "2027-01-25",
      vencimento: "2027-02-05",
    });
  });

  it("dia 31 num mês de 30 cai no último dia", () => {
    expect(cicloDaCompra("2026-04-10", { fechaDia: 31, venceDia: 10 }).fechamento).toBe(
      "2026-04-30",
    );
  });
});

describe("as faturas", () => {
  const lista = [
    compra("a", "2026-10-05", 4000),
    compra("b", "2026-10-20", 5000),
    compra("c", "2026-10-26", 3000), // já é da próxima
    compra("d", "2026-10-06", 9999, { credito: false }), // débito
    compra("e", "2026-10-07", 800, { apagadoEm: "2026-10-08T00:00:00Z" }),
    compra("f", "2026-10-07", 700, { previsto: true }),
  ];

  it("soma só compra no crédito, viva e confirmada, por fatura", () => {
    const f = faturasDoCartao(lista, nubank, "2026-10-21");
    expect(f.map((x) => [x.id, x.totalCents])).toEqual([
      ["2026-11", 3000],
      ["2026-10", 9000],
    ]);
  });

  it("aberta até o fechamento, fechada depois", () => {
    expect(
      faturasDoCartao(lista, nubank, "2026-10-21").find((x) => x.id === "2026-10")?.estado,
    ).toBe("aberta");
    expect(
      faturasDoCartao(lista, nubank, "2026-10-26").find((x) => x.id === "2026-10")?.estado,
    ).toBe("fechada");
  });

  it("paga quando a saída da fatura foi confirmada", () => {
    const paga = {
      id: "fatura-2026-10",
      data: "2026-11-05",
      tipo: "SAIDA",
      valorCents: 9000,
      previsto: false,
    } as Lancamento;
    expect(
      faturasDoCartao([...lista, paga], nubank, "2026-11-06").find((x) => x.id === "2026-10")
        ?.estado,
    ).toBe("paga");
  });
});

describe("a saída prevista da fatura", () => {
  const agora = "2026-10-21T12:00:00Z";
  const compras = [compra("a", "2026-10-05", 4000), compra("b", "2026-10-20", 5000)];

  it("nasce no vencimento com o total", () => {
    const { salvar, apagar } = planoDaFatura(compras, nubank, agora);
    expect(apagar).toEqual([]);
    expect(salvar).toHaveLength(1);
    expect(salvar[0]).toMatchObject({
      id: "fatura-2026-10",
      data: "2026-11-05",
      tipo: "SAIDA",
      valorCents: 9000,
      previsto: true,
      categoria: "fatura",
    });
  });

  it("acompanha as compras novas", () => {
    const existente = planoDaFatura(compras, nubank, agora).salvar[0];
    const mais = [...compras, compra("c", "2026-10-22", 1000), existente];
    expect(planoDaFatura(mais, nubank, agora).salvar[0].valorCents).toBe(10_000);
  });

  it("não mexe se já está certa", () => {
    const existente = planoDaFatura(compras, nubank, agora).salvar[0];
    expect(planoDaFatura([...compras, existente], nubank, agora).salvar).toEqual([]);
  });

  it("não recria a que foi apagada nem mexe na que já foi paga", () => {
    const base = planoDaFatura(compras, nubank, agora).salvar[0];
    const apagada = { ...base, apagadoEm: "2026-10-22T00:00:00Z" };
    const paga = { ...base, previsto: false, valorCents: 8800 };
    expect(planoDaFatura([...compras, apagada], nubank, agora).salvar).toEqual([]);
    expect(planoDaFatura([...compras, paga], nubank, agora).salvar).toEqual([]);
  });

  it("a que o app apagou por ficar vazia volta quando houver compra de novo", () => {
    const base = planoDaFatura(compras, nubank, agora).salvar[0];
    const vazia = { ...base, apagadoEm: "2026-10-22T00:00:00Z", fixoId: "fatura-vazia" };
    const { salvar } = planoDaFatura([...compras, vazia], nubank, agora);
    expect(salvar).toHaveLength(1);
    expect(salvar[0]).toMatchObject({
      id: "fatura-2026-10",
      valorCents: 9000,
      apagadoEm: null,
      previsto: true,
    });
  });

  it("fatura que ficou sem compra perde a previsão", () => {
    const existente = planoDaFatura(compras, nubank, agora).salvar[0];
    const semCompras = compras.map((c) => ({ ...c, apagadoEm: "2026-10-22T00:00:00Z" }));
    expect(planoDaFatura([...semCompras, existente], nubank, agora).apagar).toEqual([
      "fatura-2026-10",
    ]);
  });
});
