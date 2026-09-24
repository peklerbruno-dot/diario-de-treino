import { nomeDaCategoria, SEM_CATEGORIA, type Categoria } from "./categorias";
import type { Lancamento, Tipo } from "./tipos";

/**
 * Quanto foi para cada lugar.
 *
 * O saldo responde "quanto sobrou". Isto responde "sobrou pouco por quê" — e é
 * a pergunta que faz alguém mudar alguma coisa, porque ela aponta para um lugar
 * onde dá para mexer.
 */
export interface TotalDaCategoria {
  id: string;
  nome: string;
  centavos: number;
  /** Quantos lançamentos entraram nesta linha. */
  quantos: number;
  /** Fatia do total do tipo, de 0 a 1 — é ela que desenha a barra. */
  parte: number;
}

export interface TotaisPorCategoria {
  tipo: Tipo;
  totalCents: number;
  categorias: TotalDaCategoria[];
}

const SEM = "__sem__";

/**
 * Agrupa por categoria, de maior para menor.
 *
 * Previsto entra junto de propósito. Metade do mês que vem é previsão, e uma
 * tela que só contasse o confirmado responderia sobre um mês pela metade — no
 * dia 3, praticamente sobre nada.
 */
export function totaisPorCategoria(
  lancamentos: readonly Lancamento[],
  categorias: readonly Categoria[],
  tipo: Tipo,
): TotaisPorCategoria {
  const soma = new Map<string, { centavos: number; quantos: number }>();
  let total = 0;

  for (const l of lancamentos) {
    if (l.tipo !== tipo || l.apagadoEm) continue;
    const chave = l.categoria || SEM;
    const atual = soma.get(chave) ?? { centavos: 0, quantos: 0 };
    atual.centavos += l.valorCents;
    atual.quantos += 1;
    soma.set(chave, atual);
    total += l.valorCents;
  }

  const lista: TotalDaCategoria[] = [...soma.entries()].map(([id, { centavos, quantos }]) => ({
    id,
    nome: id === SEM ? SEM_CATEGORIA : nomeDaCategoria(categorias as Categoria[], id),
    centavos,
    quantos,
    parte: total > 0 ? centavos / total : 0,
  }));

  // Do maior para o menor: é onde está o dinheiro que a pessoa veio ver. Empate
  // desempata pelo nome, para a lista não dançar a cada recálculo.
  lista.sort((a, b) => b.centavos - a.centavos || a.nome.localeCompare(b.nome, "pt-BR"));

  return { tipo, totalCents: total, categorias: lista };
}

/** Os lançamentos de um mês, ou do ano inteiro quando o mês é nulo. */
export function doPeriodo(
  lancamentos: readonly Lancamento[],
  ano: number,
  mes: number | null,
): Lancamento[] {
  const prefixo = mes === null ? `${ano}-` : `${ano}-${String(mes).padStart(2, "0")}-`;
  return lancamentos.filter((l) => l.data.startsWith(prefixo));
}
