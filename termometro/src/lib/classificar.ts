import type { Lancamento, Tipo } from "./tipos";

/**
 * O que ainda não tem categoria, juntado por nota.
 *
 * Os 815 lançamentos que vieram da planilha nasceram sem categoria, e é honesto
 * que seja assim — ninguém escreveu essa informação lá. Mas classificar um por
 * um, 815 vezes, ninguém faz: a aba Totais ficaria para sempre dizendo "sem
 * categoria, 96%", que é o mesmo que não ter categoria nenhuma.
 *
 * A saída é a nota. A planilha repetia "aluguel" doze vezes, "salário" doze
 * vezes, "fatura" doze vezes — e quem diz "aluguel" uma vez está dizendo das
 * doze. Juntando por nota, centenas de lançamentos viram uma dúzia de decisões.
 *
 * Os grupos vêm do maior para o menor **em dinheiro**, e não em quantidade: é
 * onde está o dinheiro que muda a resposta da tela de totais, e é por onde vale
 * a pena começar quando se tem paciência para só três toques.
 */
export interface GrupoSemCategoria {
  /** Único por tipo e nota — é o que a tela usa como chave de lista. */
  chave: string;
  tipo: Tipo;
  /** Nulo quer dizer "lançamentos sem nota nenhuma", que também formam grupo. */
  nota: string | null;
  quantos: number;
  totalCents: number;
  ids: string[];
}

const SEM_NOTA = "";

/** A nota achatada, para "Aluguel" e "aluguel " caírem no mesmo grupo. */
const chaveDaNota = (nota: string | null | undefined): string => (nota ?? "").trim().toLowerCase();

export function aClassificar(lancamentos: readonly Lancamento[]): GrupoSemCategoria[] {
  const grupos = new Map<string, GrupoSemCategoria>();

  for (const l of lancamentos) {
    if (l.apagadoEm || l.categoria) continue;

    const nota = chaveDaNota(l.nota);
    const chave = `${l.tipo}|${nota}`;
    const grupo = grupos.get(chave);

    if (grupo) {
      grupo.quantos += 1;
      grupo.totalCents += l.valorCents;
      grupo.ids.push(l.id);
    } else {
      grupos.set(chave, {
        chave,
        tipo: l.tipo,
        // O primeiro a aparecer dá o nome ao grupo, com a grafia que ele tinha:
        // "Aluguel" é mais agradável de ler do que "aluguel" achatado.
        nota: nota === SEM_NOTA ? null : (l.nota?.trim() ?? null),
        quantos: 1,
        totalCents: l.valorCents,
        ids: [l.id],
      });
    }
  }

  return [...grupos.values()].sort(
    (a, b) => b.totalCents - a.totalCents || (a.nota ?? "").localeCompare(b.nota ?? "", "pt-BR"),
  );
}

/** Quantos lançamentos ainda estão sem categoria. */
export const quantosSemCategoria = (lancamentos: readonly Lancamento[]): number =>
  lancamentos.filter((l) => !l.apagadoEm && !l.categoria).length;
