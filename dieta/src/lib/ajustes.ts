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
  /** Manda, à noite, um resumo de como foi o dia. */
  resumoNoturno: boolean;
  /** A hora do resumo: "21:30". */
  resumoHora: string;
  /** Pergunta "como foi?" quando uma refeição passa da hora sem ser marcada. */
  cobrarMarcacao: boolean;
  /** Quantos minutos depois do horário da refeição. */
  cobrarDepois: number;
  /** O resumo da semana, no domingo. */
  resumoSemanal: boolean;
  resumoSemanalHora: string;
  /** Avisos de pré e pós-treino nos dias de treino. */
  treinoAvisos: boolean;
  /** Dias da semana em que você treina, 0 = domingo. */
  treinoDias: number[];
  /** Hora em que o treino começa e quanto dura, em minutos. */
  treinoHora: string;
  treinoDuracao: number;
  /** O que comer antes e depois — vira o texto dos avisos. */
  preTreino: string;
  posTreino: string;
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
  resumoNoturno: true,
  resumoHora: "21:30",
  cobrarMarcacao: true,
  cobrarDepois: 60,
  resumoSemanal: true,
  resumoSemanalHora: "19:00",
  treinoAvisos: false,
  treinoDias: [],
  treinoHora: "18:00",
  treinoDuracao: 60,
  preTreino: "",
  posTreino: "",
};

const inteiro = (s: string | undefined, padrao: number, min: number, max: number) => {
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : padrao;
};
const hora = (s: string | undefined, padrao: string) => (s && /^\d{2}:\d{2}$/.test(s) ? s : padrao);
const sim = (s: string | undefined, padrao: boolean) => (s === "1" ? true : s === "0" ? false : padrao);
const dias = (s: string | undefined, padrao: number[]) =>
  s == null ? padrao : [...new Set(s.split(",").filter((x) => x.trim() !== "").map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
const texto = (s: string | undefined, padrao: string) => (s == null ? padrao : s.slice(0, 200));

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
    resumoNoturno: sim(v.resumoNoturno, PADRAO.resumoNoturno),
    resumoHora: hora(v.resumoHora, PADRAO.resumoHora),
    cobrarMarcacao: sim(v.cobrarMarcacao, PADRAO.cobrarMarcacao),
    cobrarDepois: inteiro(v.cobrarDepois, PADRAO.cobrarDepois, 15, 240),
    resumoSemanal: sim(v.resumoSemanal, PADRAO.resumoSemanal),
    resumoSemanalHora: hora(v.resumoSemanalHora, PADRAO.resumoSemanalHora),
    treinoAvisos: sim(v.treinoAvisos, PADRAO.treinoAvisos),
    treinoDias: dias(v.treinoDias, PADRAO.treinoDias),
    treinoHora: hora(v.treinoHora, PADRAO.treinoHora),
    treinoDuracao: inteiro(v.treinoDuracao, PADRAO.treinoDuracao, 15, 240),
    preTreino: texto(v.preTreino, PADRAO.preTreino),
    posTreino: texto(v.posTreino, PADRAO.posTreino),
  };
}

/** Ajustes → linhas do banco. */
export function escreverAjustes(a: Partial<Ajustes>): { chave: string; valor: string }[] {
  return Object.entries(a).map(([chave, valor]) => ({
    chave,
    valor: typeof valor === "boolean" ? (valor ? "1" : "0") : Array.isArray(valor) ? valor.join(",") : String(valor),
  }));
}

/** 1500 → "1,5 L"; 250 → "250 ml". */
export function litros(ml: number): string {
  if (ml < 1000) return `${ml} ml`;
  const l = (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2);
  return `${l.replace(".", ",")} L`;
}
