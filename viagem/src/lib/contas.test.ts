import { describe, expect, it } from "vitest";
import {
  ErroDeDivisao,
  conferirPagadores,
  dividasPorPar,
  dividir,
  naBase,
  repartir,
  saldos,
  simplificar,
  type DespesaParaSaldo,
} from "./contas";
import { formatar, lerValor } from "./dinheiro";

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("repartir", () => {
  it("R$ 100 entre três não perde o centavo", () => {
    expect(repartir(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
  });
  it("respeita os pesos", () => {
    expect(repartir(9000, [2, 1])).toEqual([6000, 3000]);
  });
  it("peso zero não recebe nem o centavo da sobra", () => {
    const r = repartir(1001, [1, 0, 1]);
    expect(r[1]).toBe(0);
    expect(soma(r)).toBe(1001);
  });
  it("sempre soma o total, com qualquer peso", () => {
    for (let t = 1; t < 400; t += 37) {
      expect(soma(repartir(t, [0.3, 1.7, 2, 5.5, 1]))).toBe(t);
    }
  });
  it("sem peso, ninguém recebe nada", () => {
    expect(repartir(100, [0, 0])).toEqual([0, 0]);
  });
});

describe("dividir", () => {
  it("igual entre os marcados", () => {
    const p = dividir("igual", 1000, [
      { membroId: "a", valor: 0 },
      { membroId: "b", valor: 0 },
      { membroId: "c", valor: 0 },
    ]);
    expect(p.map((x) => x.valor)).toEqual([334, 333, 333]);
  });

  it("valores exatos precisam fechar o total", () => {
    expect(() =>
      dividir("exato", 1000, [
        { membroId: "a", valor: 600 },
        { membroId: "b", valor: 300 },
      ]),
    ).toThrow(/Faltam 1,00/);
    expect(
      dividir("exato", 1000, [
        { membroId: "a", valor: 700 },
        { membroId: "b", valor: 300 },
      ]).map((x) => x.valor),
    ).toEqual([700, 300]);
  });

  it("porcentagens precisam dar 100", () => {
    expect(() =>
      dividir("porcentagem", 1000, [
        { membroId: "a", valor: 50 },
        { membroId: "b", valor: 40 },
      ]),
    ).toThrow(ErroDeDivisao);
    const p = dividir("porcentagem", 1000, [
      { membroId: "a", valor: 33.33 },
      { membroId: "b", valor: 33.33 },
      { membroId: "c", valor: 33.34 },
    ]);
    expect(soma(p.map((x) => x.valor))).toBe(1000);
  });

  it("cotas: o casal conta dois", () => {
    const p = dividir("cotas", 30000, [
      { membroId: "casal", valor: 2 },
      { membroId: "solo", valor: 1 },
    ]);
    expect(p.map((x) => x.valor)).toEqual([20000, 10000]);
    expect(p[0].peso).toBe(2);
  });

  it("quem tem zero em cotas fica de fora", () => {
    const p = dividir("cotas", 100, [
      { membroId: "a", valor: 1 },
      { membroId: "b", valor: 0 },
    ]);
    expect(p).toHaveLength(1);
  });

  it("recusa valor zero e divisão sem ninguém", () => {
    expect(() => dividir("igual", 0, [{ membroId: "a", valor: 0 }])).toThrow();
    expect(() => dividir("igual", 100, [])).toThrow(/pelo menos uma/);
  });
});

describe("conferirPagadores", () => {
  it("precisa somar o total", () => {
    expect(() => conferirPagadores(100, [{ membroId: "a", valor: 50 }])).toThrow();
    expect(conferirPagadores(100, [{ membroId: "a", valor: 100 }, { membroId: "b", valor: 0 }])).toHaveLength(1);
  });
});

describe("saldos", () => {
  // Ana pagou o jantar de 300 dividido entre os três; Bruno pagou 90 de táxi para ele e o Caio.
  const despesas: DespesaParaSaldo[] = [
    {
      valor: 30000,
      cambio: 1,
      pagadores: [{ membroId: "ana", valor: 30000 }],
      partes: [
        { membroId: "ana", valor: 10000 },
        { membroId: "bruno", valor: 10000 },
        { membroId: "caio", valor: 10000 },
      ],
    },
    {
      valor: 9000,
      cambio: 1,
      pagadores: [{ membroId: "bruno", valor: 9000 }],
      partes: [
        { membroId: "bruno", valor: 4500 },
        { membroId: "caio", valor: 4500 },
      ],
    },
  ];

  it("fecha em zero", () => {
    const s = saldos(["ana", "bruno", "caio"], despesas, []);
    expect(soma(s.map((x) => x.liquido))).toBe(0);
    expect(s.find((x) => x.membroId === "ana")!.liquido).toBe(20000);
    expect(s.find((x) => x.membroId === "bruno")!.liquido).toBe(-5500);
    expect(s.find((x) => x.membroId === "caio")!.liquido).toBe(-14500);
  });

  it("um acerto abate a dívida", () => {
    const s = saldos(["ana", "bruno", "caio"], despesas, [{ deId: "caio", paraId: "ana", valor: 14500 }]);
    expect(s.find((x) => x.membroId === "caio")!.liquido).toBe(0);
    expect(s.find((x) => x.membroId === "ana")!.liquido).toBe(5500);
  });

  it("converte pesos para reais sem criar centavo fantasma", () => {
    const d: DespesaParaSaldo = {
      valor: 100001, // MX$ 1.000,01
      cambio: 0.2913,
      pagadores: [
        { membroId: "a", valor: 50001 },
        { membroId: "b", valor: 50000 },
      ],
      partes: [
        { membroId: "a", valor: 33334 },
        { membroId: "b", valor: 33334 },
        { membroId: "c", valor: 33333 },
      ],
    };
    const b = naBase(d);
    expect(b.total).toBe(29130);
    expect(soma(b.pagadores.map((p) => p.valor))).toBe(b.total);
    expect(soma(b.partes.map((p) => p.valor))).toBe(b.total);
    expect(soma(saldos(["a", "b", "c"], [d], []).map((s) => s.liquido))).toBe(0);
  });
});

describe("simplificar", () => {
  it("a Ana paga direto ao Caio", () => {
    const t = simplificar([
      { membroId: "ana", liquido: -5000 },
      { membroId: "bruno", liquido: 0 },
      { membroId: "caio", liquido: 5000 },
    ]);
    expect(t).toEqual([{ deId: "ana", paraId: "caio", valor: 5000 }]);
  });

  it("nunca passa de n − 1 transferências e zera todo mundo", () => {
    const lista = [
      { membroId: "a", liquido: 12345 },
      { membroId: "b", liquido: -2345 },
      { membroId: "c", liquido: -7000 },
      { membroId: "d", liquido: 4000 },
      { membroId: "e", liquido: -7000 },
    ];
    const t = simplificar(lista);
    expect(t.length).toBeLessThanOrEqual(lista.length - 1);
    const final = new Map(lista.map((s) => [s.membroId, s.liquido]));
    for (const x of t) {
      final.set(x.deId, final.get(x.deId)! + x.valor);
      final.set(x.paraId, final.get(x.paraId)! - x.valor);
    }
    expect([...final.values()].every((v) => v === 0)).toBe(true);
  });
});

describe("dividasPorPar", () => {
  it("compensa as dívidas de mão dupla", () => {
    const t = dividasPorPar(
      [
        { valor: 1000, cambio: 1, pagadores: [{ membroId: "a", valor: 1000 }], partes: [{ membroId: "b", valor: 1000 }] },
        { valor: 400, cambio: 1, pagadores: [{ membroId: "b", valor: 400 }], partes: [{ membroId: "a", valor: 400 }] },
      ],
      [{ deId: "b", paraId: "a", valor: 100 }],
    );
    expect(t).toEqual([{ deId: "b", paraId: "a", valor: 500 }]);
  });
});

describe("dinheiro", () => {
  it("lê o que se digita", () => {
    expect(lerValor("1.234,56")).toBe(123456);
    expect(lerValor("1234.56")).toBe(123456);
    expect(lerValor("1,234.5")).toBe(123450);
    expect(lerValor("R$ 12")).toBe(1200);
    expect(lerValor("1.500")).toBe(150000);
    expect(lerValor("abc")).toBeNull();
  });
  it("escreve com a vírgula", () => {
    expect(formatar(123456, "BRL")).toBe("R$ 1.234,56");
    expect(formatar(-500, "MXN")).toBe("−MX$ 5,00");
  });
});
