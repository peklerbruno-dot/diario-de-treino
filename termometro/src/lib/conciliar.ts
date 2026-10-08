import { somarDias } from "./datas";
import type { Lancamento, Tipo } from "./tipos";

/**
 * O salário que caiu de verdade e o salário que já estava previsto são o mesmo
 * salário.
 *
 * O fixo "Salário, dia 5" escreve um previsto no mês. Quando o dinheiro cai e
 * alguém lança — o Pix recebido, a notificação do banco, a mão — o app via um
 * valor novo e somava os dois: R$ 10.000 de salário num mês de R$ 5.000. Aqui
 * mora a pergunta "este valor que entrou é a confirmação de algum previsto?".
 *
 * Só vale para ENTRADA e SAIDA nascidas de um fixo: o diário tem regra própria
 * (o gasto real substitui a estimativa do dia) e um lançamento solto não é
 * previsão de nada. A régua é estreita de propósito — mesmo tipo, até uma
 * semana para um lado ou para o outro, valor até 25% de diferença —, porque o
 * erro de confirmar o previsto errado é pior do que o de deixar os dois: um Pix
 * de R$ 10 de um amigo nunca deve "confirmar" um salário de R$ 5.000.
 */
export const JANELA_EM_DIAS = 7;
export const TOLERANCIA_DO_VALOR = 0.25;

const dias = (de: string, ate: string): number => {
  const [a, m, d] = de.split("-").map(Number);
  const [a2, m2, d2] = ate.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a, m - 1, d)) / 86_400_000);
};

export function previstoParaConfirmar(
  novo: { tipo: Tipo; data: string; valorCents: number },
  existentes: readonly Lancamento[],
): Lancamento | null {
  if (novo.tipo === "DIARIO" || novo.valorCents <= 0) return null;

  let melhor: Lancamento | null = null;
  let melhorDistancia = Number.POSITIVE_INFINITY;
  let melhorDiferenca = Number.POSITIVE_INFINITY;

  for (const l of existentes) {
    if (l.apagadoEm || !l.previsto || !l.fixoId || l.tipo !== novo.tipo) continue;
    if (l.valorCents <= 0) continue;

    const distancia = Math.abs(dias(l.data, novo.data));
    if (distancia > JANELA_EM_DIAS) continue;

    const diferenca = Math.abs(l.valorCents - novo.valorCents) / l.valorCents;
    if (diferenca > TOLERANCIA_DO_VALOR) continue;

    // O mais perto no calendário; no empate, o mais perto no valor.
    if (
      distancia < melhorDistancia ||
      (distancia === melhorDistancia && diferenca < melhorDiferenca)
    ) {
      melhor = l;
      melhorDistancia = distancia;
      melhorDiferenca = diferenca;
    }
  }
  return melhor;
}

/** De onde começar a procurar, e até onde: a janela em volta da data nova. */
export const janelaDeBusca = (data: string): { de: string; ate: string } => ({
  de: somarDias(data, -JANELA_EM_DIAS),
  ate: somarDias(data, JANELA_EM_DIAS),
});

/**
 * O previsto, agora confirmado: vale o valor e a dia reais, e fica o que o
 * previsto já sabia (a nota "Salário", a categoria, "dinheiro seu").
 */
export function confirmadoCom(
  previsto: Lancamento,
  real: { data: string; valorCents: number },
  agora: string,
): Lancamento {
  return {
    ...previsto,
    data: real.data,
    valorCents: real.valorCents,
    previsto: false,
    atualizadoEm: agora,
  };
}
