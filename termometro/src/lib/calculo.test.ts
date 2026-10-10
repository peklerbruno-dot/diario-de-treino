import { describe, expect, it } from "vitest";
import {
  calcularAno,
  calcularAnoEncadeado,
  gerarPrevisao,
  previstosVencidos,
  primeiroDiaNoVermelho,
  sobraPorDia,
  somaDosFixosNoMes,
  previstosSubstituidos,
} from "./calculo";
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
      lancamentos: [lancamento("2026-03-05", "SAIDA", 600), lancamento("2026-03-20", "SAIDA", 600)],
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

describe("a previsão respeita o que a pessoa decidiu", () => {
  const fixo = (dia: number, tipo: Tipo, reais: number, extras: Partial<Fixo> = {}): Fixo => ({
    id: `fixo-${dia}-${tipo}`,
    tipo,
    dia,
    valorCents: Math.round(reais * 100),
    ativo: true,
    ...extras,
  });

  it("previsto apagado não ressuscita", () => {
    const f = fixo(10, "SAIDA", 1000);
    const primeira = gerarPrevisao({
      fixos: [f],
      de: "2026-10-01",
      ate: "2026-12-31",
      existentes: [],
      novoId: proximoId,
    });
    // A pessoa apagou o de novembro: "esse mês não pago".
    const decididos = primeira.map((l) =>
      l.data === "2026-11-10" ? { ...l, apagadoEm: "2026-10-02T00:00:00.000Z" } : l,
    );
    const segunda = gerarPrevisao({
      fixos: [f],
      de: "2026-10-01",
      ate: "2026-12-31",
      existentes: decididos,
      novoId: proximoId,
    });
    expect(segunda).toEqual([]);
  });

  it("mudar o dia do fixo não dobra o mês", () => {
    const antes = fixo(10, "SAIDA", 1000);
    const primeira = gerarPrevisao({
      fixos: [antes],
      de: "2026-10-01",
      ate: "2026-10-31",
      existentes: [],
      novoId: proximoId,
    });
    // A regra mudou do dia 10 para o dia 15: outubro já tem a vez dele.
    const segunda = gerarPrevisao({
      fixos: [{ ...antes, dia: 15 }],
      de: "2026-10-01",
      ate: "2026-10-31",
      existentes: primeira,
      novoId: proximoId,
    });
    expect(segunda).toEqual([]);
  });

  it("o todo-dia continua olhando dia a dia", () => {
    const f = fixo(0, "DIARIO", 60);
    const primeira = gerarPrevisao({
      fixos: [f],
      de: "2026-11-01",
      ate: "2026-11-02",
      existentes: [],
      novoId: proximoId,
    });
    const segunda = gerarPrevisao({
      fixos: [f],
      de: "2026-11-01",
      ate: "2026-11-03",
      existentes: primeira,
      novoId: proximoId,
    });
    expect(segunda.map((l) => l.data)).toEqual(["2026-11-03"]);
  });
});

describe("a corrente de anos", () => {
  it("um saldo digitado para um ano sem lançamentos vale na corrente", () => {
    const calculado = calcularAnoEncadeado({
      ano: 2027,
      lancamentos: [lancamento("2026-03-10", "ENTRADA", 1000)],
      saldosIniciais: { 2027: 500000 },
      rateioAptoPercent: 40,
    });
    expect(calculado.meses[0].dias[0].saldoCents).toBe(500000);
  });

  it("sem saldo digitado, 2027 começa onde 2026 terminou", () => {
    const calculado = calcularAnoEncadeado({
      ano: 2027,
      lancamentos: [lancamento("2026-03-10", "ENTRADA", 1000)],
      saldosIniciais: {},
      rateioAptoPercent: 40,
    });
    expect(calculado.meses[0].dias[0].saldoCents).toBe(100000);
  });

  it("uma data digitada errado não arrasta a corrente por séculos", () => {
    const calculado = calcularAnoEncadeado({
      ano: 2026,
      lancamentos: [
        lancamento("0206-05-10", "ENTRADA", 50),
        lancamento("2026-01-02", "ENTRADA", 10),
      ],
      saldosIniciais: {},
      rateioAptoPercent: 40,
    });
    // Não trava, e o ano insano não vira o começo da corrente.
    expect(calculado.ano).toBe(2026);
    expect(calculado.meses[0].dias[1].saldoCents).toBe(1000);
  });
});

describe("quanto dá por dia", () => {
  it("é o fechamento previsto dividido pelos dias que faltam, hoje incluso", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-11-01", "ENTRADA", 3000)],
      ajustes: semAjuste,
    });
    // 10 de novembro: faltam 21 dias (10 a 30). 3000 / 21 = 142,85… → R$ 142.
    const sobra = sobraPorDia(ano, "2026-11-10");
    expect(sobra).not.toBeNull();
    expect(sobra!.diasRestantes).toBe(21);
    expect(sobra!.porDiaCents).toBe(14200);
  });

  it("o diário PREVISTO não conta: a pergunta é 'sem gastar nada, quanto sobra?'", () => {
    // Entrou 3000; o fixo "gasto do dia" prevê 60 por dia de 10 a 30 (21 dias = 1260).
    const previstos = Array.from({ length: 21 }, (_, i) =>
      lancamento(`2026-11-${String(10 + i).padStart(2, "0")}`, "DIARIO", 60, { previsto: true }),
    );
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        lancamento("2026-11-01", "ENTRADA", 3000),
        lancamento("2026-11-10", "DIARIO", 25), // o que já foi hoje, de verdade
        ...previstos,
      ],
      ajustes: semAjuste,
    });
    const sobra = sobraPorDia(ano, "2026-11-10")!;
    // O fechamento da tela é 3000 − 25 − 1260 = 1715; para o "dá por dia" o
    // previsto volta: 2975 / 21 = 141,6 → R$ 141.
    expect(sobra.fechamentoCents).toBe(297500);
    expect(sobra.porDiaCents).toBe(14100);
    expect(sobra.gastoDeHojeCents).toBe(2500);
    expect(sobra.noVermelho).toBe(false);
  });

  it("fechamento positivo pequeno não é vermelho, só não dá um real por dia", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-11-01", "ENTRADA", 20)],
      ajustes: semAjuste,
    });
    const sobra = sobraPorDia(ano, "2026-11-01")!;
    expect(sobra.porDiaCents).toBe(0);
    expect(sobra.noVermelho).toBe(false);
  });

  it("mês que já fecha no vermelho dá zero por dia, sem número negativo", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [lancamento("2026-11-01", "SAIDA", 3000)],
      ajustes: semAjuste,
    });
    const sobra = sobraPorDia(ano, "2026-11-10")!;
    expect(sobra.porDiaCents).toBe(0);
    expect(sobra.noVermelho).toBe(true);
  });

  it("fora do ano calculado, não inventa resposta", () => {
    const ano = calcularAno({ ano: 2026, lancamentos: [], ajustes: semAjuste });
    expect(sobraPorDia(ano, "2027-01-01")).toBeNull();
  });
});

describe("previstos vencidos", () => {
  it("lista o que passou (e o de hoje), mais antigo primeiro", () => {
    const vencidos = previstosVencidos(
      [
        lancamento("2026-09-25", "SAIDA", 100, { previsto: true }),
        lancamento("2026-09-27", "SAIDA", 200, { previsto: true }),
        lancamento("2026-09-28", "SAIDA", 300, { previsto: true }),
        lancamento("2026-09-20", "SAIDA", 400, {
          previsto: true,
          apagadoEm: "2026-09-21T00:00:00.000Z",
        }),
        lancamento("2026-09-01", "SAIDA", 500),
      ],
      "2026-09-27",
    );
    expect(vencidos.map((l) => l.data)).toEqual(["2026-09-25", "2026-09-27"]);
  });
});

describe("a soma dos fixos num mês", () => {
  it("regra mensal conta uma vez, todo-dia conta por dia", () => {
    const soma = somaDosFixosNoMes(
      [
        { id: "a", tipo: "ENTRADA", dia: 5, valorCents: 210000, ativo: true },
        { id: "b", tipo: "SAIDA", dia: 10, valorCents: 90000, ativo: true },
        { id: "c", tipo: "DIARIO", dia: 0, valorCents: 6000, ativo: true },
        { id: "d", tipo: "SAIDA", dia: 1, valorCents: 99999, ativo: false },
      ],
      2026,
      11,
    );
    expect(soma.entraCents).toBe(210000);
    expect(soma.saiCents).toBe(90000 + 6000 * 30);
  });
});

describe("o gasto real substitui o previsto do diário", () => {
  const dia = (
    id: string,
    tipo: "DIARIO" | "ENTRADA",
    valorCents: number,
    previsto: boolean,
    data = "2026-10-06",
  ) => ({
    id,
    data,
    tipo,
    valorCents,
    previsto,
    fixoId: previsto ? "f" : null,
  });

  it("sem gasto real, os R$ 60 contam", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [dia("p", "DIARIO", 6000, true)],
      ajustes: { saldoInicialCents: 100_000, rateioAptoPercent: 40 },
    });
    expect(ano.meses[9].dias[5].diarioCents).toBe(6000);
    expect(ano.meses[9].dias[5].diarioSubstituido).toBe(false);
  });

  it("com gasto real no dia, só o real conta", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [dia("p", "DIARIO", 6000, true), dia("r", "DIARIO", 5358, false)],
      ajustes: { saldoInicialCents: 100_000, rateioAptoPercent: 40 },
    });
    const d = ano.meses[9].dias[5];
    expect(d.diarioCents).toBe(5358);
    expect(d.diarioSubstituido).toBe(true);
    expect(d.temPrevisto).toBe(false);
    expect(ano.meses[9].totais.diarioCents).toBe(5358);
  });

  it("o real de um dia não mexe no previsto de outro", () => {
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [
        dia("p1", "DIARIO", 6000, true, "2026-10-06"),
        dia("p2", "DIARIO", 6000, true, "2026-10-07"),
        dia("r", "DIARIO", 1000, false, "2026-10-06"),
      ],
      ajustes: { saldoInicialCents: 0, rateioAptoPercent: 40 },
    });
    expect(ano.meses[9].dias[5].diarioCents).toBe(1000);
    expect(ano.meses[9].dias[6].diarioCents).toBe(6000);
  });

  it("previstosSubstituidos e previstosVencidos concordam", () => {
    const lista = [dia("p", "DIARIO", 6000, true), dia("r", "DIARIO", 1000, false)] as never[];
    expect([...previstosSubstituidos(lista)]).toEqual(["p"]);
    expect(previstosVencidos(lista, "2026-10-08")).toEqual([]);
  });

  it("entrada prevista não é substituída por gasto", () => {
    const lista = [dia("e", "ENTRADA", 500_000, true), dia("r", "DIARIO", 1000, false)] as never[];
    expect(previstosSubstituidos(lista).size).toBe(0);
  });
});

describe("a estimativa do diário só conta dos dias que vêm", () => {
  const prev = (data: string) => ({
    id: `p-${data}`,
    data,
    tipo: "DIARIO" as const,
    valorCents: 6000,
    previsto: true,
    fixoId: "f",
  });
  const ajustes = { saldoInicialCents: 100_000, rateioAptoPercent: 40 };
  const lancamentos = [prev("2026-10-07"), prev("2026-10-08"), prev("2026-10-09")] as never[];

  it("hoje (e antes) valem o que foi lançado; amanhã em diante, a estimativa", () => {
    const ano = calcularAno({ ano: 2026, lancamentos, ajustes, hoje: "2026-10-08" });
    const dias = ano.meses[9].dias;
    expect(dias[6].diarioCents).toBe(0); // ontem, sem lançamento
    expect(dias[7].diarioCents).toBe(0); // hoje, sem lançamento
    expect(dias[8].diarioCents).toBe(6000); // amanhã, a estimativa
    expect(dias[7].diarioPrevistoFora).toBe(true);
    expect(dias[8].diarioPrevistoFora).toBe(false);
  });

  it("o saldo de agora não desconta os R$ 60 de hoje", () => {
    const ano = calcularAno({ ano: 2026, lancamentos, ajustes, hoje: "2026-10-08" });
    expect(ano.meses[9].dias[7].saldoCents).toBe(100_000);
    expect(ano.meses[9].dias[8].saldoCents).toBe(100_000 - 6000);
  });

  it("sem informar o dia, tudo conta, como antes", () => {
    const ano = calcularAno({ ano: 2026, lancamentos, ajustes });
    expect(ano.meses[9].dias[7].diarioCents).toBe(6000);
  });

  it("gasto real hoje vale o real, e só ele", () => {
    const real = {
      id: "r",
      data: "2026-10-08",
      tipo: "DIARIO",
      valorCents: 2500,
      previsto: false,
    } as never;
    const ano = calcularAno({
      ano: 2026,
      lancamentos: [...lancamentos, real],
      ajustes,
      hoje: "2026-10-08",
    });
    expect(ano.meses[9].dias[7].diarioCents).toBe(2500);
  });

  it("a sobra por dia não soma de volta o que não foi descontado", () => {
    const ano = calcularAno({ ano: 2026, lancamentos, ajustes, hoje: "2026-10-08" });
    const sobra = sobraPorDia(ano, "2026-10-08");
    // Só o previsto de amanhã estava no fechamento, e só ele volta.
    expect(sobra?.fechamentoCents).toBe(ano.meses[9].totais.saldoFechamentoCents + 6000);
  });

  it("a conferência não cobra o dia de hoje, só os que passaram", () => {
    expect(previstosVencidos(lancamentos, "2026-10-08").map((l) => l.data)).toEqual(["2026-10-07"]);
  });
});

describe("compra no crédito não mexe no saldo", () => {
  const ajustes = { saldoInicialCents: 100_000, rateioAptoPercent: 40 };
  const credito = {
    id: "c",
    data: "2026-10-08",
    tipo: "DIARIO",
    valorCents: 4500,
    credito: true,
    previsto: false,
  } as never;

  it("fica fora do saldo e do gasto do dia, e aparece à parte", () => {
    const ano = calcularAno({ ano: 2026, lancamentos: [credito], ajustes });
    const d = ano.meses[9].dias[7];
    expect(d.saldoCents).toBe(100_000);
    expect(d.diarioCents).toBe(0);
    expect(d.creditoCents).toBe(4500);
    expect(ano.meses[9].totais.creditoCents).toBe(4500);
  });

  it("mesmo assim substitui a estimativa do diário do dia", () => {
    const previsto = {
      id: "p",
      data: "2026-10-08",
      tipo: "DIARIO",
      valorCents: 6000,
      previsto: true,
      fixoId: "f",
    } as never;
    const ano = calcularAno({ ano: 2026, lancamentos: [credito, previsto], ajustes });
    expect(ano.meses[9].dias[7].saldoCents).toBe(100_000);
  });

  it("o gasto de hoje na sobra por dia não conta o crédito", () => {
    const ano = calcularAno({ ano: 2026, lancamentos: [credito], ajustes, hoje: "2026-10-08" });
    expect(sobraPorDia(ano, "2026-10-08")?.gastoDeHojeCents).toBe(0);
  });
});
