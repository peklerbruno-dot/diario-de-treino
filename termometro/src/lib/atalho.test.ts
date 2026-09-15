import { describe, expect, it } from "vitest";
import { hojeNoFuso, lerPedidoDoAtalho, recadoDoAtalho } from "./atalho";
import type { Lancamento } from "./tipos";

let n = 0;
const id = () => `id-${++n}`;
const opcoes = { agora: "2026-09-15T12:00:00.000Z", hoje: "2026-09-15", novoId: id };

const ler = (corpo: Parameters<typeof lerPedidoDoAtalho>[0]) => lerPedidoDoAtalho(corpo, opcoes);

describe("o que o atalho manda", () => {
  it("com o valor só, é gasto do dia a dia, hoje", () => {
    const r = ler({ valor: "38,50" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lancamentos).toHaveLength(1);
    expect(r.lancamentos[0]).toMatchObject({
      data: "2026-09-15",
      tipo: "DIARIO",
      valorCents: 3850,
      previsto: false,
      nota: null,
    });
  });

  it("aceita número, que é como o Atalhos entrega o que você digitou", () => {
    const r = ler({ valor: 38.5 });
    expect(r.ok && r.lancamentos[0].valorCents).toBe(3850);
  });

  it("aceita a soma, igual ao app", () => {
    const r = ler({ valor: "195+15+83" });
    expect(r.ok && r.lancamentos.map((l) => l.valorCents)).toEqual([19500, 1500, 8300]);
  });

  it.each([
    ["entrada", "ENTRADA"],
    ["Entrada", "ENTRADA"],
    ["saída", "SAIDA"],
    ["saida", "SAIDA"],
    ["diário", "DIARIO"],
    ["gasto", "DIARIO"],
  ])("entende o tipo escrito como %s", (escrito, esperado) => {
    const r = ler({ valor: "10", tipo: escrito });
    expect(r.ok && r.lancamentos[0].tipo).toBe(esperado);
  });

  it("guarda a nota quando vem", () => {
    const r = ler({ valor: "22", nota: " almoço " });
    expect(r.ok && r.lancamentos[0].nota).toBe("almoço");
  });

  it("aceita a data que o aparelho mandar", () => {
    const r = ler({ valor: "10", data: "2026-03-02" });
    expect(r.ok && r.lancamentos[0].data).toBe("2026-03-02");
  });

  it("marca renda própria só em entrada", () => {
    const entrada = ler({ valor: "100", tipo: "entrada", rendaPropria: "sim" });
    expect(entrada.ok && entrada.lancamentos[0].rendaPropria).toBe(true);

    const gasto = ler({ valor: "100", tipo: "diário", rendaPropria: true });
    expect(gasto.ok && gasto.lancamentos[0].rendaPropria).toBe(false);
  });
});

describe("o que o atalho manda errado", () => {
  it.each([[undefined], [""], ["   "], [null], [{}]])("recusa valor %s", (valor) => {
    const r = ler({ valor });
    expect(r.ok).toBe(false);
  });

  it("recusa o que não é número", () => {
    const r = ler({ valor: "muito caro" });
    expect(r).toMatchObject({ ok: false });
  });

  it("recusa valor negativo, e diz o que fazer", () => {
    const r = ler({ valor: "-30" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toMatch(/coluna/);
  });

  it("recusa um tipo que não existe em vez de inventar", () => {
    const r = ler({ valor: "10", tipo: "investimento" });
    expect(r.ok).toBe(false);
  });

  it("recusa data que o calendário não tem", () => {
    const r = ler({ valor: "10", data: "2026-02-30" });
    expect(r.ok).toBe(false);
  });

  it("ignora data mal escrita e usa hoje", () => {
    const r = ler({ valor: "10", data: "15/09/2026" });
    expect(r.ok && r.lancamentos[0].data).toBe("2026-09-15");
  });
});

describe("o dia certo", () => {
  it("é o do fuso de quem usa, não o do servidor", () => {
    // 15 de setembro, 01h em Londres, ainda é dia 14 em São Paulo.
    const madrugada = new Date("2026-09-15T01:00:00.000Z");
    expect(hojeNoFuso("America/Sao_Paulo", madrugada)).toBe("2026-09-14");
    expect(hojeNoFuso("UTC", madrugada)).toBe("2026-09-15");
  });
});

describe("o recado da notificação", () => {
  const lancamento = (tipo: Lancamento["tipo"], reais: number): Lancamento => ({
    id: id(),
    data: "2026-09-15",
    tipo,
    valorCents: reais * 100,
  });

  it("diz o que entrou e quanto sobrou", () => {
    expect(recadoDoAtalho([lancamento("DIARIO", 38.5)], 149743)).toBe(
      "R$ 38,50 no diário. Saldo de hoje: R$ 1.497,43.",
    );
  });

  it("conta quantos foram, quando foi mais de um", () => {
    const recado = recadoDoAtalho([lancamento("DIARIO", 10), lancamento("DIARIO", 5)], 100);
    expect(recado).toContain("2 lançamentos");
    expect(recado).toContain("R$ 15,00");
  });

  it("fala 'entrou' quando foi entrada", () => {
    expect(recadoDoAtalho([lancamento("ENTRADA", 2100)], 500000)).toContain("entrou");
  });
});
