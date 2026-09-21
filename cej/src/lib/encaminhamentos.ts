/**
 * A lógica do painel "na minha mão".
 *
 * Uma lista de encaminhamentos por ordem de cadastro é uma lista que ninguém
 * lê. O que faz alguém agir é a distância até o prazo — e é só isso que este
 * arquivo calcula. Função pura, sem banco e sem tela.
 */

import { distanciaEmDias, hoje as hojeDeVerdade } from "./datas";
import type { EstadoDoEncaminhamento } from "./tipos";

export type Urgencia = "VENCIDO" | "HOJE" | "ESTA_SEMANA" | "DEPOIS" | "SEM_PRAZO";

export const TITULO_DA_URGENCIA: Record<Urgencia, string> = {
  VENCIDO: "Atrasados",
  HOJE: "Para hoje",
  ESTA_SEMANA: "Próximos sete dias",
  DEPOIS: "Mais adiante",
  SEM_PRAZO: "Sem prazo",
};

/**
 * "Sem prazo" fica por último, e não no topo, de propósito: sem prazo não é
 * urgente, é indefinido. Deixá-lo no topo faria a lista abrir justamente pelo
 * que não precisa de decisão hoje.
 */
export const ORDEM_DA_URGENCIA: Urgencia[] = [
  "VENCIDO", "HOJE", "ESTA_SEMANA", "DEPOIS", "SEM_PRAZO",
];

export type ComPrazo = {
  prazo: string | null;
  estado: EstadoDoEncaminhamento;
};

export function urgenciaDe(item: ComPrazo, hoje = hojeDeVerdade()): Urgencia {
  if (!item.prazo) return "SEM_PRAZO";
  const dias = distanciaEmDias(hoje, item.prazo);
  if (dias < 0) return "VENCIDO";
  if (dias === 0) return "HOJE";
  if (dias <= 7) return "ESTA_SEMANA";
  return "DEPOIS";
}

/**
 * Um encaminhamento fechado nunca está atrasado.
 *
 * Parece óbvio escrito assim, e é justamente o tipo de coisa que some quando a
 * tela filtra por estado num lugar e calcula urgência em outro: bastava alguém
 * pedir "tudo, inclusive o que já foi feito" para a tela encher de vermelho em
 * cima de tarefa concluída.
 */
export function urgenciaVisivel(item: ComPrazo, hoje = hojeDeVerdade()): Urgencia | null {
  if (item.estado !== "ABERTO") return null;
  return urgenciaDe(item, hoje);
}

export function agrupar<T extends ComPrazo>(
  itens: T[],
  hoje = hojeDeVerdade(),
): { urgencia: Urgencia; titulo: string; itens: T[] }[] {
  const caixas = new Map<Urgencia, T[]>(ORDEM_DA_URGENCIA.map((u) => [u, []]));
  for (const item of itens) caixas.get(urgenciaDe(item, hoje))!.push(item);

  // Dentro de cada caixa, o prazo mais próximo primeiro. Os sem prazo ficam na
  // ordem em que vieram — que é a de cadastro, e é a única que existe.
  for (const [, lista] of caixas) {
    lista.sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""));
  }

  return ORDEM_DA_URGENCIA.map((urgencia) => ({
    urgencia,
    titulo: TITULO_DA_URGENCIA[urgencia],
    itens: caixas.get(urgencia)!,
  })).filter((caixa) => caixa.itens.length > 0);
}

/** O número que a casca mostra na aba: o que está aberto e já venceu ou vence hoje. */
export function quantosPedemAtencao(itens: ComPrazo[], hoje = hojeDeVerdade()): number {
  return itens.filter((i) => {
    const u = urgenciaVisivel(i, hoje);
    return u === "VENCIDO" || u === "HOJE";
  }).length;
}
