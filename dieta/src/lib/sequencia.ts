/**
 * Quantos dias seguidos no plano.
 *
 * Um dia conta quando pelo menos 80% das refeições daquele dia foram marcadas
 * como "segui" — exigir 100% faria uma fruta trocada zerar a semana, e a ideia
 * aqui é incentivar, não punir. Dia sem refeição no plano (um domingo livre,
 * por exemplo) não conta nem quebra.
 *
 * Hoje entra na conta só quando já fechou os 80%: o dia ainda não acabou, e
 * não faz sentido a sequência "quebrar" às 9h da manhã.
 */

export const FRACAO_DO_DIA_BOM = 0.8;

export type DiaParaSequencia = { dia: string; seguiu: number };

/**
 * `dias` vem do mais novo para o mais velho, começando por hoje.
 * `refeicoesNoDia(dia)` diz quantas refeições o plano tem naquele dia.
 */
export function diasSeguidos(dias: DiaParaSequencia[], refeicoesNoDia: (dia: string) => number): number {
  let conta = 0;
  for (let i = 0; i < dias.length; i++) {
    const d = dias[i];
    const total = refeicoesNoDia(d.dia);
    if (total === 0) continue;
    if (d.seguiu >= Math.ceil(total * FRACAO_DO_DIA_BOM)) conta++;
    else if (i === 0) continue; // hoje ainda pode virar
    else break;
  }
  return conta;
}
