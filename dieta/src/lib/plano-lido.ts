import { normalizarConteudo, type Conteudo } from "./conteudo";
import { normalizarHora } from "./datas";

/**
 * O formato do plano depois de lido, e a conferência da resposta do Gemini.
 *
 * Fica fora de `leitor.ts` para dar para testar sem o Gemini e sem o servidor.
 */

export type RefeicaoLida = {
  nome: string;
  horario: string;
  conteudo: Conteudo;
  nota: string;
  dias: number[];
};

export type PlanoLido = {
  nome: string;
  orientacoes: string;
  /** Meta de água que o plano pede, em ml, ou null se não pede. */
  aguaMl: number | null;
  refeicoes: RefeicaoLida[];
};

export class ErroDeLeitura extends Error {}

/** Separado para dar para testar sem chamar o Gemini. */
export function interpretarResposta(bruto: string): PlanoLido {
  let j: unknown;
  try {
    j = JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new ErroDeLeitura("A leitura voltou num formato estranho. Tente de novo.");
  }
  const o = (j ?? {}) as Record<string, unknown>;
  const texto = (x: unknown) => (typeof x === "string" ? x.trim() : "");

  const refeicoes: RefeicaoLida[] = [];
  for (const item of Array.isArray(o.refeicoes) ? o.refeicoes : []) {
    const r = (item ?? {}) as Record<string, unknown>;
    const nome = texto(r.nome).slice(0, 60);
    const conteudo = normalizarConteudo(r.opcoes);
    if (!nome || conteudo.length === 0) continue;
    const dias = Array.isArray(r.dias)
      ? [...new Set(r.dias.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
      : [];
    refeicoes.push({
      nome,
      horario: normalizarHora(texto(r.horario)) ?? "12:00",
      conteudo,
      nota: texto(r.nota).slice(0, 500),
      // Os sete dias marcados é o mesmo que nenhum.
      dias: dias.length === 7 ? [] : dias,
    });
  }
  refeicoes.sort((a, b) => a.horario.localeCompare(b.horario));

  const agua = Number(o.aguaMl);
  return {
    nome: texto(o.nome).slice(0, 80) || "Plano da nutricionista",
    orientacoes: texto(o.orientacoes).slice(0, 3000),
    aguaMl: Number.isFinite(agua) && agua >= 500 && agua <= 8000 ? Math.round(agua) : null,
    refeicoes,
  };
}
