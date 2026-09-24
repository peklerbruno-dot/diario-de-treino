import { describe, expect, it } from "vitest";
import { calcularAno, gerarPrevisao, primeiroDiaNoVermelho } from "./calculo";
import type { Fixo, Lancamento, Tipo } from "./tipos";

let sequencia = 0;
const proximoId = () => `id-${++sequencia}`;

function lancamento(
  data: string,
  tipo: Tipo,
  reais: number,
  extras: Partial<Lancamento> = {},
): Lancamento {
  return {
    id: proximoId(),
    data,
    tipo,
    valorCents: Math.round(reais * 100),
    criadoEm: "2026-01-01T00:00:00.000Z",
    atualizadoEm: "2026-01-01T00:00:00.000Z",
    ...extras,
  };
}

const semAjuste = { saldoInicialCents: 0, rateioAptoPercent: 40 };

describe("o saldo dia a dia", () => {
  it("é o de ontem mais o que entrou menos o que saiu", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-01-02", "SAIDA", 381.05),
        lancamento("2026-01-02", "DIARIO", 195),
        lancamento("2026-01-02", "DIARIO", 15),
        lancamento("2026-01-02", "DIARIO", 83),
      ],
      ajustes: { ...semAjuste, saldoInicialCents: 202356 },
    });

    const janeiro = ano.meses[0];
    expect(janeiro.dias[0].saldoCents).toBe(202356); // dia 1º, sem movimento
    // 2023,56 − 381,05 − (195 + 15 + 83)
    expect(janeiro.dias[1].saldoCents).toBe(134951);
    expect(janeiro.dias[1].diarioCents).toBe(29300);
  });

  it("atravessa o mês: fevereiro começa onde janeiro parou", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-01-31", "ENTRADA", 1000)],
      ajustes: semAjuste,
    });

    expect(ano.meses[0].totais.saldoFechamentoCents).toBe(100000);
    expect(ano.meses[1].totais.saldoAberturaCents).toBe(100000);
    expect(ano.meses[1].dias[0].saldoCents).toBe(100000);
  });

  it("carrega o saldo de abertura do ano até dezembro", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [],
      ajustes: { ...semAjuste, saldoInicialCents: 500_00 },
    });

    expect(ano.saldoFinalCents).toBe(500_00);
    expect(ano.meses[11].dias[30].saldoCents).toBe(500_00);
  });

  it("dá a cada mês o número de dias que ele tem de verdade", () => {
    const ano = calcularAno({ ano: 2026, lancamentos: [], ajustes: semAjuste });
    expect(ano.meses[1].dias).toHaveLength(28); // fevereiro de 2026
    expect(ano.meses[10].dias).toHaveLength(30); // novembro
    expect(ano.meses[0].dias).toHaveLength(31);
  });

  it("ignora o que foi apagado e o que é de outro ano", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-03-10", "ENTRADA", 100, { apagadoEm: "2026-03-11T00:00:00.000Z" }),
        lancamento("2025-03-10", "ENTRADA", 999),
        lancamento("2026-03-10", "ENTRADA", 50),
      ],
      ajustes: semAjuste,
    });

    expect(ano.meses[2].totais.entradasCents).toBe(5000);
  });
});

describe("o rodapé do mês", () => {
  const ano = calcularAno({
    ano: 2026,
    lancamentos: [
      lancamento("2026-01-14", "ENTRADA", 7065.9, { rendaPropria: true }),
      lancamento("2026-01-08", "ENTRADA", 1000), // resgate: não é renda própria
      lancamento("2026-01-10", "SAIDA", 900, { apartamento: true }),
      lancamento("2026-01-31", "SAIDA", 2000, { investimento: true }),
      lancamento("2026-01-05", "DIARIO", 62),
      lancamento("2026-01-06", "DIARIO", 31),
    ],
    ajustes: semAjuste,
  });
  const totais = ano.meses[0].totais;

  it("soma as três colunas", () => {
    expect(totais.entradasCents).toBe(806590);
    expect(totais.saidasCents).toBe(290000);
    expect(totais.diarioCents).toBe(9300);
  });

  it("chama de saída total as saídas mais o diário", () => {
    expect(totais.saidaTotalCents).toBe(290000 + 9300);
  });

  it("divide o diário pelos dias que o mês tem, e não por 30 fixo", () => {
    // A planilha somava os 31 dias de janeiro e dividia por 30.
    expect(totais.mediaDiariaCents).toBe(Math.round(9300 / 31));
  });

  it("separa a entrada que é dinheiro seu", () => {
    expect(totais.entradaPropriaCents).toBe(706590);
  });

  it("mede o investido sobre a entrada própria", () => {
    expect(totais.investidoCents).toBe(200000);
    expect(totais.investidoPercent).toBeCloseTo((200000 / 706590) * 100, 6);
  });

  it("não inventa percentual quando não houve entrada própria", () => {
    const vazio = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-02-01", "SAIDA", 100, { investimento: true })],
      ajustes: semAjuste,
    });
    expect(vazio.meses[1].totais.investidoPercent).toBeNull();
  });

  it("chama de performance o que sobrou: entradas menos tudo que saiu", () => {
    expect(totais.performanceCents).toBe(806590 - (290000 + 9300));
  });

  it("rateia as saídas do apartamento pelo percentual combinado", () => {
    expect(totais.aptoCents).toBe(90000);
    expect(totais.aptoParteDoOutroCents).toBe(36000); // 40%
  });

  it("guarda o ponto mais baixo do mês, que é o que aperta", () => {
    const apertado = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-01-10", "SAIDA", 900),
        lancamento("2026-01-20", "ENTRADA", 2000),
      ],
      ajustes: { ...semAjuste, saldoInicialCents: 100000 },
    });
    expect(apertado.meses[0].totais.saldoMinimoCents).toBe(10000);
    expect(apertado.meses[0].totais.diaDoSaldoMinimo).toBe(10);
  });
});

describe("o termômetro", () => {
  it("aponta o primeiro dia em que o saldo fica negativo", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-03-05", "SAIDA", 600),
        lancamento("2026-03-20", "SAIDA", 600),
      ],
      ajustes: { ...semAjuste, saldoInicialCents: 100000 },
    });

    expect(primeiroDiaNoVermelho(ano, "2026-01-01")?.data).toBe("2026-03-20");
    expect(primeiroDiaNoVermelho(ano, "2026-04-01")?.data).toBe("2026-04-01");
  });

  it("não acha vermelho onde não há", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-03-05", "ENTRADA", 600)],
      ajustes: semAjuste,
    });
    expect(primeiroDiaNoVermelho(ano, "2026-01-01")).toBeNull();
  });
});

describe("a previsão dos dias que ainda não chegaram", () => {
  const fixo = (dia: number, tipo: Tipo, reais: number, extras: Partial<Fixo> = {}): Fixo => ({
    id: `fixo-${dia}-${tipo}`,
    tipo,
    dia,
    valorCents: Math.round(reais * 100),
    ativo: true,
    ...extras,
  });

  it("escreve o fixo no dia certo de cada mês", () => {
    const novos = gerarPrevisao({
      fixos: [fixo(5, "ENTRADA", 2100)],
      de: "2026-10-01",
      ate: "2026-12-31",
      existentes: [],
      novoId: proximoId,
    });

    expect(novos.map((l) => l.data)).toEqual(["2026-10-05", "2026-11-05", "2026-12-05"]);
    expect(novos.every((l) => l.previsto)).toBe(true);
    expect(novos[0].fixoId).toBe("fixo-5-ENTRADA");
  });

  it("dia 0 quer dizer todo santo dia", () => {
    const novos = gerarPrevisao({
      fixos: [fixo(0, "DIARIO", 60)],
      de: "2026-11-01",
      ate: "2026-11-30",
      existentes: [],
      novoId: proximoId,
    });
    expect(novos).toHaveLength(30);
  });

  it("desce o dia 31 para o último dia do mês que não o tem", () => {
    const novos = gerarPrevisao({
      fixos: [fixo(31, "SAIDA", 8000, { investimento: true })],
      de: "2026-11-01",
      ate: "2026-11-30",
      existentes: [],
      novoId: proximoId,
    });

    // Na planilha esses R$ 8.000 ficavam numa linha 31 que novembro não tem.
    expect(novos).toHaveLength(1);
    expect(novos[0].data).toBe("2026-11-30");
    expect(novos[0].investimento).toBe(true);
  });

  it("não escreve duas vezes o mesmo fixo no mesmo dia", () => {
    const jaLancado = lancamento("2026-10-05", "ENTRADA", 2100, {
      fixoId: "fixo-5-ENTRADA",
      previsto: true,
    });

    const novos = gerarPrevisao({
      fixos: [fixo(5, "ENTRADA", 2100)],
      de: "2026-10-01",
      ate: "2026-11-30",
      existentes: [jaLancado],
      novoId: proximoId,
    });

    expect(novos.map((l) => l.data)).toEqual(["2026-11-05"]);
  });

  it("deixa de fora o fixo desligado e o apagado", () => {
    const novos = gerarPrevisao({
      fixos: [
        fixo(5, "ENTRADA", 2100, { ativo: false }),
        fixo(6, "ENTRADA", 100, { apagadoEm: "2026-09-01T00:00:00.000Z" }),
      ],
      de: "2026-10-01",
      ate: "2026-10-31",
      existentes: [],
      novoId: proximoId,
    });
    expect(novos).toHaveLength(0);
  });

  it("previsto e confirmado somam igual no saldo: o termômetro mede os dois", () => {
    const previstos = gerarPrevisao({
      fixos: [fixo(10, "SAIDA", 1300)],
      de: "2026-10-01",
      ate: "2026-10-31",
      existentes: [],
      novoId: proximoId,
    });

    const ano = calcularAno({ ano: 2026, lancamentos: previstos, ajustes: semAjuste });
    expect(ano.meses[9].totais.saidasCents).toBe(130000);
    expect(ano.meses[9].totais.temPrevisto).toBe(true);
  });
});

describe("a previsão atravessa o Ano-Novo", () => {
  const salario = {
    id: "f1",
    tipo: "ENTRADA" as const,
    dia: 5,
    valorCents: 500000,
    nota: "salário",
    ativo: true,
  };

  it("vai de outubro de um ano até dezembro do seguinte, sem parar em 31/12", () => {
    const novos = gerarPrevisao({
      fixos: [salario],
      de: "2026-10-01",
      ate: "2027-12-31",
      existentes: [],
      agora: "2026-10-01T12:00:00.000Z",
      novoId: (() => {
        let n = 0;
        return () => `p${++n}`;
      })(),
    });

    const datas = novos.map((l) => l.data);
    // Três em 2026 (out, nov, dez) e os doze de 2027.
    expect(datas).toHaveLength(15);
    expect(datas[0]).toBe("2026-10-05");
    expect(datas.at(-1)).toBe("2027-12-05");
    expect(datas.filter((d) => d.startsWith("2027"))).toHaveLength(12);
  });

  it("um fixo de dia 31 cai no último dia dos meses curtos do ano que vem", () => {
    const novos = gerarPrevisao({
      fixos: [{ ...salario, dia: 31 }],
      de: "2027-02-01",
      ate: "2027-04-30",
      existentes: [],
      agora: "2027-02-01T12:00:00.000Z",
      novoId: (() => {
        let n = 0;
        return () => `q${++n}`;
      })(),
    });
    expect(novos.map((l) => l.data)).toEqual(["2027-02-28", "2027-03-31", "2027-04-30"]);
  });
});
