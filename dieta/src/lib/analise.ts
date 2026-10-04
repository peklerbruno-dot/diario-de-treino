/**
 * O que a leitura de uma foto do prato devolve, e a conferência da resposta.
 *
 * Fica fora de `leitor.ts` para dar para testar sem o Gemini e sem o servidor.
 * Os números são estimativas — o Gemini olha a foto, não pesa o prato — e a
 * tela diz isso com um "≈" em todo número.
 */

export type Veredito = "sim" | "parcial" | "nao" | "sem-plano";

export type Analise = {
  /** "Arroz, feijão, frango grelhado e salada." */
  descricao: string;
  itens: { alimento: string; quantidade: string }[];
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  /** O prato bate com o que o plano pedia para esta refeição? */
  noPlano: Veredito;
  /** Uma ou duas frases comparando com o plano, em tom de quem ajuda. */
  comentario: string;
};

const VEREDITOS: Veredito[] = ["sim", "parcial", "nao", "sem-plano"];

const texto = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");
const numero = (x: unknown, max: number) => {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : 0;
};

/** Qualquer coisa (o JSON do Gemini, o do banco) → análise válida, ou null. */
export function normalizarAnalise(bruto: unknown): Analise | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const descricao = texto(o.descricao, 300);
  const itens = (Array.isArray(o.itens) ? o.itens : [])
    .map((i) => {
      const it = (i ?? {}) as Record<string, unknown>;
      return { alimento: texto(it.alimento, 80), quantidade: texto(it.quantidade, 60) };
    })
    .filter((i) => i.alimento)
    .slice(0, 20);
  if (!descricao && itens.length === 0) return null;
  const veredito = texto(o.noPlano, 20) as Veredito;
  return {
    descricao,
    itens,
    calorias: numero(o.calorias, 5000),
    proteinas: numero(o.proteinas, 500),
    carboidratos: numero(o.carboidratos, 800),
    gorduras: numero(o.gorduras, 400),
    noPlano: VEREDITOS.includes(veredito) ? veredito : "sem-plano",
    comentario: texto(o.comentario, 400),
  };
}

/** A resposta crua do Gemini (às vezes com ```json em volta) → análise. */
export function lerRespostaDaFoto(bruto: string): Analise | null {
  try {
    return normalizarAnalise(JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch {
    return null;
  }
}

/** O que marcar na refeição a partir da foto: bateu com o plano → "segui". */
export const sugestaoDeMarca = (a: Analise | null): "seguiu" | "trocou" | null =>
  !a || a.noPlano === "sem-plano" ? null : a.noPlano === "sim" ? "seguiu" : "trocou";

/** Soma as estimativas de um dia (das fotos que tiverem análise). */
export function somarDia(analises: (Analise | null)[]) {
  const total = { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fotos: 0 };
  for (const a of analises) {
    if (!a) continue;
    total.calorias += a.calorias;
    total.proteinas += a.proteinas;
    total.carboidratos += a.carboidratos;
    total.gorduras += a.gorduras;
    total.fotos++;
  }
  return total;
}

/** 1450 → "1.450". */
export const milhar = (n: number) => n.toLocaleString("pt-BR");
