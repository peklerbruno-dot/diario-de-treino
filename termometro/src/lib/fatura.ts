import { diasNoMes, montarData, partesDaData } from "./datas";
import type { Lancamento } from "./tipos";

/**
 * A fatura do cartão de crédito.
 *
 * Comprar no crédito não tira dinheiro da conta: o dinheiro sai no vencimento
 * da fatura, de uma vez. Contar a compra no saldo de agora fazia o saldo mentir
 * duas vezes — para menos na compra e, se a fatura fosse lançada depois, para
 * menos de novo. Aqui a compra vai para a fatura do seu ciclo, e a fatura vira
 * UMA saída prevista no dia do vencimento, que o app mantém sozinho enquanto as
 * compras chegam. "Aconteceu" nessa saída é pagar a fatura.
 *
 * Duas regras de calendário, as do Nubank: compra feita **no dia do
 * fechamento** já entra na fatura seguinte (é o "melhor dia de compra"); e o
 * vencimento cai no mesmo mês do fechamento se o dia dele for depois, e no mês
 * seguinte se for antes (fecha dia 25, vence dia 5 → vence no mês que vem).
 */
export interface Cartao {
  /** Dia do mês em que a fatura fecha (1–31). */
  fechaDia: number;
  /** Dia do mês em que ela vence (1–31). */
  venceDia: number;
}

export const CHAVE_DO_CARTAO = "cartao";

const diaValido = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 31;

export function lerCartao(bruto: string | undefined): Cartao | null {
  if (!bruto) return null;
  try {
    const lido = JSON.parse(bruto) as { fecha?: unknown; vence?: unknown };
    if (diaValido(lido.fecha) && diaValido(lido.vence)) {
      return { fechaDia: lido.fecha, venceDia: lido.vence };
    }
  } catch {
    // Texto malformado: é como se o cartão não estivesse cadastrado.
  }
  return null;
}

export const escreverCartao = (c: Cartao): string =>
  JSON.stringify({ fecha: c.fechaDia, vence: c.venceDia });

export interface Ciclo {
  /** O mês em que a fatura fecha, "AAAA-MM": é a identidade da fatura. */
  id: string;
  fechamento: string;
  vencimento: string;
}

const somarMeses = (ano: number, mes: number, n: number) => {
  const total = ano * 12 + (mes - 1) + n;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
};

const diaNoMes = (ano: number, mes: number, dia: number) =>
  montarData(ano, mes, Math.min(dia, diasNoMes(ano, mes)));

const idDoCiclo = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;

/** De qual fatura é uma compra feita neste dia. */
export function cicloDaCompra(data: string, cartao: Cartao): Ciclo {
  const { ano, mes, dia } = partesDaData(data);
  // No dia do fechamento (ou depois), a compra é da fatura que fecha no mês seguinte.
  const fecha =
    dia >= Math.min(cartao.fechaDia, diasNoMes(ano, mes)) ? somarMeses(ano, mes, 1) : { ano, mes };
  const vence = cartao.venceDia > cartao.fechaDia ? fecha : somarMeses(fecha.ano, fecha.mes, 1);
  return {
    id: idDoCiclo(fecha.ano, fecha.mes),
    fechamento: diaNoMes(fecha.ano, fecha.mes, cartao.fechaDia),
    vencimento: diaNoMes(vence.ano, vence.mes, cartao.venceDia),
  };
}

export const idDaSaidaDaFatura = (ciclo: string) => `fatura-${ciclo}`;
export const NOTA_DA_FATURA = "Fatura do cartão";

/**
 * Marca da saída que o app apagou sozinho porque a fatura ficou sem compra
 * (mudar o dia de fechamento muda as faturas). É diferente de a pessoa apagar:
 * a que ela apagou fica apagada; a que o app apagou volta quando houver compra.
 */
export const APAGADA_PELO_APP = "fatura-vazia";

const vivo = (l: Lancamento) => !l.apagadoEm;
export const ehCompraNoCredito = (l: Lancamento) =>
  vivo(l) && !!l.credito && l.tipo === "DIARIO" && !l.previsto;

export interface Fatura extends Ciclo {
  totalCents: number;
  compras: Lancamento[];
  /** `aberta` ainda recebe compras; `fechada` espera o pagamento; `paga` já foi. */
  estado: "aberta" | "fechada" | "paga";
}

/** Todas as faturas que têm compra, a mais nova primeiro. */
export function faturasDoCartao(
  lancamentos: readonly Lancamento[],
  cartao: Cartao,
  hoje: string,
): Fatura[] {
  const porCiclo = new Map<string, { ciclo: Ciclo; compras: Lancamento[] }>();
  for (const l of lancamentos) {
    if (!ehCompraNoCredito(l)) continue;
    const ciclo = cicloDaCompra(l.data, cartao);
    const grupo = porCiclo.get(ciclo.id);
    if (grupo) grupo.compras.push(l);
    else porCiclo.set(ciclo.id, { ciclo, compras: [l] });
  }

  const pagas = new Set(
    lancamentos
      .filter((l) => vivo(l) && !l.previsto && l.id.startsWith("fatura-"))
      .map((l) => l.id),
  );

  return [...porCiclo.values()]
    .map(({ ciclo, compras }): Fatura => {
      compras.sort(
        (a, b) =>
          b.data.localeCompare(a.data) || (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""),
      );
      return {
        ...ciclo,
        compras,
        totalCents: compras.reduce((t, c) => t + c.valorCents, 0),
        estado: pagas.has(idDaSaidaDaFatura(ciclo.id))
          ? "paga"
          : hoje < ciclo.fechamento
            ? "aberta"
            : "fechada",
      };
    })
    .sort((a, b) => b.vencimento.localeCompare(a.vencimento));
}

/**
 * O que fazer com as saídas previstas das faturas.
 *
 * Cada fatura com compra tem uma saída prevista no vencimento, com o total.
 * Ela acompanha as compras até ser confirmada (paga) ou apagada: apagar é uma
 * decisão ("essa não vou pagar assim") e não é desfeita, como nos fixos. Uma
 * fatura que ficou sem compra leva a previsão embora.
 *
 * `existentes` traz todos os lançamentos, inclusive os apagados.
 */
export function planoDaFatura(
  existentes: readonly Lancamento[],
  cartao: Cartao,
  agora: string,
): { salvar: Lancamento[]; apagar: string[] } {
  const porId = new Map(existentes.map((l) => [l.id, l]));
  const totais = new Map<string, { ciclo: Ciclo; total: number }>();
  for (const l of existentes) {
    if (!ehCompraNoCredito(l)) continue;
    const ciclo = cicloDaCompra(l.data, cartao);
    const t = totais.get(ciclo.id) ?? { ciclo, total: 0 };
    t.total += l.valorCents;
    totais.set(ciclo.id, t);
  }

  const salvar: Lancamento[] = [];
  for (const { ciclo, total } of totais.values()) {
    const id = idDaSaidaDaFatura(ciclo.id);
    const atual = porId.get(id);
    if (atual && atual.apagadoEm && atual.fixoId !== APAGADA_PELO_APP) continue; // a pessoa a apagou
    if (atual && !atual.apagadoEm && !atual.previsto) continue; // já paga
    if (
      atual &&
      !atual.apagadoEm &&
      atual.data === ciclo.vencimento &&
      atual.valorCents === total
    ) {
      continue;
    }
    salvar.push({
      id,
      data: ciclo.vencimento,
      tipo: "SAIDA",
      valorCents: total,
      nota: NOTA_DA_FATURA,
      categoria: "fatura",
      previsto: true,
      rendaPropria: false,
      investimento: false,
      apartamento: false,
      credito: false,
      fixoId: null,
      criadoEm: atual?.criadoEm ?? agora,
      atualizadoEm: agora,
      apagadoEm: null,
    });
  }

  const apagar = existentes
    .filter(
      (l) =>
        l.id.startsWith("fatura-") &&
        vivo(l) &&
        l.previsto &&
        !totais.has(l.id.slice("fatura-".length)),
    )
    .map((l) => l.id);

  return { salvar, apagar };
}
