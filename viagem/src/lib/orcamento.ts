/**
 * O orçamento: quanto o grupo combinou gastar, contra quanto já gastou.
 * Tudo na moeda base, em centavos. Função pura — testada em orcamento.test.ts.
 */

export type Orcamento = { total?: number; porPessoa?: number; categorias?: Record<string, number> };

export type Linha = { chave: string; limite: number; gasto: number; fracao: number; estado: "ok" | "atencao" | "estourou" };

/** A partir de 80% acende o amarelo; acima de 100%, o vermelho. */
export const ALERTA = 0.8;

const linha = (chave: string, limite: number, gasto: number): Linha => {
  const fracao = limite > 0 ? gasto / limite : 0;
  return { chave, limite, gasto, fracao, estado: fracao > 1 ? "estourou" : fracao >= ALERTA ? "atencao" : "ok" };
};

export function lerOrcamento(bruto: unknown): Orcamento {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.round(x) : undefined);
  const categorias: Record<string, number> = {};
  for (const [k, v] of Object.entries((o.categorias as Record<string, unknown>) ?? {})) {
    const x = n(v);
    if (x) categorias[k] = x;
  }
  return { total: n(o.total), porPessoa: n(o.porPessoa), categorias };
}

export function acompanharOrcamento(
  orcamento: Orcamento,
  gastos: { total: number; porCategoria: Map<string, number>; consumoPorPessoa: Map<string, number> },
) {
  return {
    total: orcamento.total ? linha("total", orcamento.total, gastos.total) : null,
    categorias: Object.entries(orcamento.categorias ?? {}).map(([c, limite]) => linha(c, limite, gastos.porCategoria.get(c) ?? 0)),
    pessoas: orcamento.porPessoa
      ? [...gastos.consumoPorPessoa.entries()].map(([id, gasto]) => linha(id, orcamento.porPessoa!, gasto))
      : [],
  };
}

/** Média por dia até agora, e a projeção para a viagem inteira nesse ritmo. */
export function ritmo(total: number, diasPassados: number, diasDaViagem: number) {
  if (diasPassados <= 0) return null;
  const porDia = Math.round(total / diasPassados);
  return { porDia, projecao: porDia * diasDaViagem };
}
