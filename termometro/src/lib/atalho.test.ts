import { describe, expect, it } from "vitest";
import { camposDoEndereco, hojeNoFuso, lerPedidoDoAtalho, recadoDoAtalho } from "./atalho";
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
      valorCents: 3900,
      previsto: false,
      nota: null,
    });
  });

  it("aceita número, que é como o Atalhos entrega o que você digitou", () => {
    const r = ler({ valor: 38.5 });
    expect(r.ok && r.lancamentos[0].valorCents).toBe(3900);
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

  it("entende o valor ditado à Siri, com a palavra no meio", () => {
    expect(ler({ valor: "38 reais e 50" }).ok && ler({ valor: "38 reais e 50" })).toMatchObject({
      lancamentos: [{ valorCents: 3900 }],
    });
    const casos: [string, number][] = [
      // O valor ainda é lido com centavos e arredondado na entrada: o app não
      // guarda centavo nenhum, e a notificação já devolve o valor redondo.
      ["38 reais e 50 centavos", 3900],
      ["38 reais 50", 3900],
      ["38 reais", 3800],
      ["1 real", 100],
      ["38,50 reais", 3900],
      ["R$ 38,50", 3900],
      ["r$ 1.234,56", 123500],
      ["38 reais e 5", 3900],
    ];
    for (const [dito, cents] of casos) {
      const r = ler({ valor: dito });
      expect(r.ok && r.lancamentos[0].valorCents, dito).toBe(cents);
    }
  });

  // Este é o teste que existe por causa de um erro de verdade: a leitura antiga
  // apagava tudo o que não fosse dígito, e "38 reais e 50" virava R$ 3.850,00 —
  // dez vezes o valor, calado, dentro do saldo.
  it("não cola os dígitos de um ditado que tem mais de uma leitura", () => {
    for (const dito of ["38 e 50", "2 cafés de 5", "38 50"]) {
      const r = ler({ valor: dito });
      expect(r.ok, dito).toBe(false);
      if (!r.ok) expect(r.erro).toContain("38 reais e 50 centavos");
    }
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
      "R$ 39 no diário. Saldo de hoje: R$ 1.497.",
    );
  });

  it("conta quantos foram, quando foi mais de um", () => {
    const recado = recadoDoAtalho([lancamento("DIARIO", 10), lancamento("DIARIO", 5)], 100);
    expect(recado).toContain("2 lançamentos");
    expect(recado).toContain("R$ 15");
  });

  it("fala 'entrou' quando foi entrada", () => {
    expect(recadoDoAtalho([lancamento("ENTRADA", 2100)], 500000)).toContain("entrou");
  });
});

describe("o que vem no próprio endereço", () => {
  const url = (busca: string) => `https://exemplo.com/api/lancar?${busca}`;

  it("lê o valor grudado no fim do endereço", () => {
    expect(camposDoEndereco(url("valor=38,50"))).toEqual({ valor: "38,50" });
  });

  it("lê também o tipo, a categoria, a nota e a data", () => {
    expect(
      camposDoEndereco(url("valor=90&tipo=entrada&categoria=freela&nota=nf&data=2026-09-10")),
    ).toEqual({
      valor: "90",
      tipo: "entrada",
      categoria: "freela",
      nota: "nf",
      data: "2026-09-10",
    });
  });

  /**
   * Este teste existe porque a categoria ficou de fora desta lista na primeira
   * vez: o atalho mandava, o app aceitava em teor, e o campo era jogado fora
   * caladamente no meio do caminho. Um campo que some sem erro é o pior jeito
   * de uma funcionalidade não funcionar.
   */
  it("todo campo que a porta aceita também entra pelo endereço", () => {
    const busca =
      "valor=1&tipo=saida&categoria=contas&nota=x&data=2026-01-01" +
      "&rendaPropria=sim&investimento=sim&apartamento=sim";
    expect(Object.keys(camposDoEndereco(url(busca))).sort()).toEqual([
      "apartamento",
      "categoria",
      "data",
      "investimento",
      "nota",
      "rendaPropria",
      "tipo",
      "valor",
    ]);
  });

  // Esta é a regra que separa os dois segredos. O valor pode ficar num registro
  // de servidor; o código de acesso, não — ele abre o dinheiro inteiro.
  it("nunca lê o código do endereço, nem quando alguém o escreve lá", () => {
    const campos = camposDoEndereco(url("valor=10&codigo=secreto&x-codigo=secreto"));
    expect(campos).toEqual({ valor: "10" });
    expect(JSON.stringify(campos)).not.toContain("secreto");
  });

  it("ignora o que não conhece", () => {
    expect(camposDoEndereco(url("valor=10&qualquer=coisa"))).toEqual({ valor: "10" });
  });

  it("devolve vazio quando não há busca nenhuma", () => {
    expect(camposDoEndereco("https://exemplo.com/api/lancar")).toEqual({});
  });

  it("não quebra com um endereço torto", () => {
    expect(camposDoEndereco("nem endereço é")).toEqual({});
  });

  it("o que vem do endereço é lido igual ao que vem do corpo", () => {
    const r = lerPedidoDoAtalho(camposDoEndereco(url("valor=38 reais e 50&tipo=saída")), opcoes);
    expect(r.ok && r.lancamentos[0]).toMatchObject({ valorCents: 3900, tipo: "SAIDA" });
  });
});

describe("a categoria que a Siri fala", () => {
  const categorias = [
    { id: "mercado", nome: "Mercado", tipos: ["DIARIO" as const] },
    { id: "contas", nome: "Contas", tipos: ["SAIDA" as const] },
  ];
  const comLista = (corpo: Parameters<typeof lerPedidoDoAtalho>[0]) =>
    lerPedidoDoAtalho(corpo, { ...opcoes, categorias });

  it("vira o identificador guardado no lançamento", () => {
    const r = comLista({ valor: "90", categoria: "mercado" });
    expect(r.ok && r.lancamentos[0].categoria).toBe("mercado");
  });

  it("uma frase inteira ainda acha a categoria", () => {
    const r = comLista({ valor: "180", tipo: "saída", categoria: "conta de luz" });
    expect(r.ok && r.lancamentos[0].categoria).toBe("contas");
  });

  /** Perder o gasto porque a Siri ouviu errado desfaria o que o atalho resolve. */
  it("categoria que não existe não derruba o lançamento, e é avisada", () => {
    const r = comLista({ valor: "25", categoria: "jiu-jitsu" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lancamentos[0].categoria).toBeNull();
    expect(r.lancamentos[0].valorCents).toBe(2500);
    expect(r.categoriaNaoAchada).toBe("jiu-jitsu");
  });

  it("sem categoria falada, nada é avisado", () => {
    const r = comLista({ valor: "25" });
    expect(r.ok && r.categoriaNaoAchada).toBeUndefined();
  });
});

describe("o recado diz a categoria", () => {
  const um = [{ id: "a", data: "2026-09-15", tipo: "DIARIO" as const, valorCents: 9000 }];

  it("para um erro de ditado aparecer na hora, e não no fim do mês", () => {
    expect(recadoDoAtalho(um, 150000, { nome: "Mercado" })).toBe(
      "R$ 90 no diário em Mercado. Saldo de hoje: R$ 1.500.",
    );
  });

  it("avisa quando não achou, sem esconder que o valor entrou", () => {
    expect(recadoDoAtalho(um, 150000, { naoAchada: "jiu-jitsu" })).toContain(
      'não achei a categoria "jiu-jitsu"',
    );
  });

  it("sem categoria, a frase é a de sempre", () => {
    expect(recadoDoAtalho(um, 150000)).toBe("R$ 90 no diário. Saldo de hoje: R$ 1.500.");
  });
});
