import { somarDias } from "./datas";
import type { Lancamento } from "./tipos";

/**
 * Os botões de valor da tela Hoje: um toque e o gasto entra no Diário.
 *
 * A pergunta que eles respondem é "quanto foi?", não "no que foi" — quem sai
 * do caixa com o celular na mão sabe o valor na hora; a categoria pode esperar.
 *
 * Duas partes:
 *
 * - **A escada**, fixa: de 5 em 5 até 50, de 10 em 10 até 100, depois degraus
 *   maiores. Fina embaixo porque é embaixo que mora quase todo gasto do dia a
 *   dia, e espaçada em cima porque ninguém precisa escolher entre R$ 185 e
 *   R$ 190 num toque. Fixa de propósito: botão que muda de lugar não vira
 *   memória do dedo. Até onde ela vai depende de você — até o valor que cobre
 *   95% dos seus gastos do dia a dia, e nunca menos que R$ 100.
 *
 * - **Os seus de sempre**: os valores "quebrados" que você repete (o R$ 38 do
 *   almoço, o R$ 12 do café) e que a escada não tem. Saem da sua história, e
 *   só entram com três repetições ou mais — duas vezes é coincidência.
 *
 * Tudo calculado no aparelho, a partir dos lançamentos que já estão nele.
 */

const ESCADA = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 250, 300,
  400, 500,
];

/** Abaixo disto a história ainda não diz nada, e a escada vai até R$ 100. */
const MINIMO_PARA_APRENDER = 10;
const REPETICOES_PARA_SER_DE_SEMPRE = 3;
const QUANTOS_DE_SEMPRE = 8;

export interface ValoresRapidos {
  /** Em centavos, crescente. */
  escada: number[];
  /** Em centavos, crescente. Os valores que se repetem e a escada não tem. */
  deSempre: number[];
  /** Quantos gastos do último ano entraram na conta. */
  baseadoEm: number;
  /** Metade dos gastos fica até aqui (em centavos). `null` sem história. */
  medianaCents: number | null;
}

export function valoresRapidos(lancamentos: readonly Lancamento[], hoje: string): ValoresRapidos {
  const desde = somarDias(hoje, -365);
  const reais = lancamentos
    .filter(
      (l) =>
        !l.apagadoEm &&
        !l.previsto &&
        l.tipo === "DIARIO" &&
        l.valorCents > 0 &&
        l.data >= desde &&
        l.data <= hoje,
    )
    .map((l) => Math.round(l.valorCents / 100))
    .filter((r) => r > 0)
    .sort((a, b) => a - b);

  const emCentavos = (r: number) => r * 100;

  if (reais.length < MINIMO_PARA_APRENDER) {
    return {
      escada: ESCADA.filter((v) => v <= 100).map(emCentavos),
      deSempre: [],
      baseadoEm: reais.length,
      medianaCents: null,
    };
  }

  const quantil = (q: number) => reais[Math.min(reais.length - 1, Math.floor(q * reais.length))];
  const p95 = quantil(0.95);
  const teto = Math.max(100, ESCADA.find((v) => v >= p95) ?? ESCADA[ESCADA.length - 1]);
  const escada = ESCADA.filter((v) => v <= teto);

  const vezes = new Map<number, number>();
  for (const r of reais) vezes.set(r, (vezes.get(r) ?? 0) + 1);
  const deSempre = [...vezes.entries()]
    .filter(([valor, n]) => n >= REPETICOES_PARA_SER_DE_SEMPRE && !escada.includes(valor))
    // Os mais repetidos primeiro para o corte; depois, em ordem de valor.
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, QUANTOS_DE_SEMPRE)
    .map(([valor]) => valor)
    .sort((a, b) => a - b);

  return {
    escada: escada.map(emCentavos),
    deSempre: deSempre.map(emCentavos),
    baseadoEm: reais.length,
    medianaCents: emCentavos(quantil(0.5)),
  };
}
