/**
 * A cor da coluna de saldo — a formatação condicional da planilha, trazida
 * para o app.
 *
 * Na planilha a coluna do saldo é um degradê, e é essa mancha que deixa ver a
 * forma do mês antes de ler número nenhum: onde aperta, onde folga, em que dia
 * vira.
 *
 * A régua é a **faixa do próprio mês**, não o zero. Foi o erro da primeira
 * versão: medindo a distância até o zero, um mês que anda entre R$ 47 mil e
 * R$ 50 mil saía inteiro no mesmo verde — todos os dias a mais de 94% do
 * máximo. Uma coluna de trinta células com uma cor só não informa nada. Medido
 * contra o topo e o fundo do mês, o mesmo mês mostra a própria forma, que é o
 * que a planilha fazia.
 *
 * O zero continua mandando no **sinal**: abaixo dele é vermelho, acima é verde,
 * sempre, sem depender de faixa nenhuma. Faixa escolhe o tom; o zero escolhe a
 * cor.
 *
 * E o verde puxa para o azul-petróleo de propósito. Verde contra vermelho é o
 * par mais bonito para quem enxerga as duas cores e o pior para quem não
 * enxerga: no daltonismo mais comum os dois viram o mesmo ocre. Com o verde
 * puxado, a distância entre os polos sobe de 5,3 para 9,0 (o piso é 8). O resto
 * do trabalho quem faz é a luminosidade — forte e pálido se enxergam sem cor
 * nenhuma — e o número, que está escrito dentro da célula, com sinal.
 */

export type BracoDaEscala = "sobrou" | "faltou" | "zero";

export interface CorDoSaldo {
  braco: BracoDaEscala;
  /** De 1 (o fundo da faixa) a 5 (o topo). Sempre 0 quando o braço é zero. */
  degrau: 0 | 1 | 2 | 3 | 4 | 5;
}

/** O topo e o fundo do mês, que são a régua contra a qual cada dia é medido. */
export interface FaixaDoMes {
  /** O menor saldo positivo do mês — o degrau mais pálido do verde. */
  menorPositivoCents: number;
  /** O maior saldo positivo do mês — o degrau mais forte. */
  maiorPositivoCents: number;
  /** O saldo mais negativo do mês, em módulo — o degrau mais forte do vermelho. */
  piorNegativoCents: number;
}

const DEGRAUS = 5;
const MEIO = 3;

export function faixaDoMes(saldosCents: readonly number[]): FaixaDoMes {
  let menorPositivo = Infinity;
  let maiorPositivo = -Infinity;
  let piorNegativo = 0;

  for (const s of saldosCents) {
    if (!Number.isFinite(s)) continue;
    if (s > 0) {
      menorPositivo = Math.min(menorPositivo, s);
      maiorPositivo = Math.max(maiorPositivo, s);
    } else if (s < 0) {
      piorNegativo = Math.max(piorNegativo, -s);
    }
  }

  return {
    menorPositivoCents: Number.isFinite(menorPositivo) ? menorPositivo : 0,
    maiorPositivoCents: Number.isFinite(maiorPositivo) ? maiorPositivo : 0,
    piorNegativoCents: piorNegativo,
  };
}

/** Em que degrau da faixa cai uma parte, de 0 a 1. */
const degrauDe = (parte: number) =>
  Math.min(Math.max(Math.ceil(parte * DEGRAUS), 1), DEGRAUS) as 1 | 2 | 3 | 4 | 5;

export function corDoSaldo(cents: number, faixa: FaixaDoMes): CorDoSaldo {
  if (!Number.isFinite(cents) || cents === 0) return { braco: "zero", degrau: 0 };

  if (cents < 0) {
    const pior = faixa.piorNegativoCents;
    if (pior <= 0) return { braco: "faltou", degrau: DEGRAUS };
    return { braco: "faltou", degrau: degrauDe(Math.min(-cents / pior, 1)) };
  }

  const { menorPositivoCents: chao, maiorPositivoCents: teto } = faixa;
  // Mês de um valor só, ou faixa sem largura: o meio da escala. Qualquer tom
  // serve quando não há o que comparar, e o do meio é o que menos sugere
  // "está no fundo" ou "está no topo".
  if (teto <= chao) return { braco: "sobrou", degrau: MEIO };

  return { braco: "sobrou", degrau: degrauDe((cents - chao) / (teto - chao)) };
}

/** A classe do Tailwind que pinta a célula. */
export function classeDoSaldo({ braco, degrau }: CorDoSaldo): string {
  if (braco === "zero") return "";
  return `bg-${braco}-${degrau}`;
}
