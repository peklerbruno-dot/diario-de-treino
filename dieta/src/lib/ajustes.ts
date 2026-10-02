/**
 * Os ajustes do app, com os valores de fábrica.
 *
 * No banco cada um é uma linha de texto (`Ajuste`); aqui eles ganham tipo e um
 * valor padrão, para o app funcionar desde a primeira abertura sem ninguém ter
 * passado pela tela de Ajustes.
 */

export type Ajustes = {
  /** Manda aviso na hora das refeições. */
  avisarRefeicoes: boolean;
  /** Quantos minutos antes do horário o aviso sai (0 = na hora). */
  antecedencia: number;
  /** Meta de água do dia, em ml. */
  aguaMeta: number;
  /** O copo que você usa, em ml — o tamanho de cada toque. */
  copo: number;
  /** Manda lembrete de beber água. */
  avisarAgua: boolean;
  /** De quanto em quanto tempo, em minutos. */
  aguaIntervalo: number;
  /** Janela dos lembretes de água: "08:00" a "21:00". */
  aguaInicio: string;
  aguaFim: string;
};

export const PADRAO: Ajustes = {
  avisarRefeicoes: true,
  antecedencia: 0,
  aguaMeta: 2000,
  copo: 250,
  avisarAgua: true,
  aguaIntervalo: 90,
  aguaInicio: "08:00",
  aguaFim: "21:00",
};

const inteiro = (s: string | undefined, padrao: number, min: number, max: number) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : padrao;
};
const hora = (s: string | undefined, padrao: string) => (s && /^\d{2}:\d{2}$/.test(s) ? s : padrao);
const sim = (s: string | undefined, padrao: boolean) => (s === "1" ? true : s === "0" ? false : padrao);

/** As linhas do banco → ajustes com tipo. O que faltar ou vier estranho cai no padrão. */
export function lerAjustes(linhas: { chave: string; valor: string }[]): Ajustes {
  const v = Object.fromEntries(linhas.map((l) => [l.chave, l.valor])) as Record<string, string | undefined>;
  return {
    avisarRefeicoes: sim(v.avisarRefeicoes, PADRAO.avisarRefeicoes),
    antecedencia: inteiro(v.antecedencia, PADRAO.antecedencia, 0, 120),
    aguaMeta: inteiro(v.aguaMeta, PADRAO.aguaMeta, 250, 8000),
    copo: inteiro(v.copo, PADRAO.copo, 50, 2000),
    avisarAgua: sim(v.avisarAgua, PADRAO.avisarAgua),
    aguaIntervalo: inteiro(v.aguaIntervalo, PADRAO.aguaIntervalo, 30, 360),
    aguaInicio: hora(v.aguaInicio, PADRAO.aguaInicio),
    aguaFim: hora(v.aguaFim, PADRAO.aguaFim),
  };
}

/** Ajustes → linhas do banco. */
export function escreverAjustes(a: Partial<Ajustes>): { chave: string; valor: string }[] {
  return Object.entries(a).map(([chave, valor]) => ({
    chave,
    valor: typeof valor === "boolean" ? (valor ? "1" : "0") : String(valor),
  }));
}

/** 1500 → "1,5 L"; 250 → "250 ml". */
export function litros(ml: number): string {
  if (ml < 1000) return `${ml} ml`;
  const l = (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2);
  return `${l.replace(".", ",")} L`;
}
