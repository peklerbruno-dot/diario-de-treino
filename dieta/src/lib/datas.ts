/**
 * O relógio do app: tudo no horário de São Paulo.
 *
 * O servidor da Vercel roda em UTC. Se o app perguntasse "que horas são?" ao
 * servidor sem dizer o fuso, o almoço das 12h30 avisaria às 9h30 — e depois das
 * 21h o "hoje" já seria amanhã. A conversão passa pelo `Intl`, e não por um
 * "-3" fixo: se o horário de verão voltar, a conta continua certa.
 */

export const FUSO = process.env.NEXT_PUBLIC_FUSO || "America/Sao_Paulo";

export type Agora = {
  /** "2026-10-02" */
  dia: string;
  /** Minutos desde a meia-noite: 12h30 = 750. */
  minutos: number;
  /** 0 = domingo. */
  diaDaSemana: number;
};

const SEMANA_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dois = (n: number) => String(n).padStart(2, "0");

/** Dia, minuto e dia da semana de um instante, no relógio do fuso. */
export function agoraNoFuso(instante = new Date(), fuso = FUSO): Agora {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: fuso,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(instante).map((x) => [x.type, x.value]));
  return {
    dia: `${p.year}-${p.month}-${p.day}`,
    minutos: Number(p.hour) * 60 + Number(p.minute),
    diaDaSemana: SEMANA_EN.indexOf(p.weekday),
  };
}

export const hoje = (instante = new Date()) => agoraNoFuso(instante).dia;

/** "07:30" → 450. Devolve null para o que não for uma hora. */
export function paraMinutos(hora: string): number | null {
  const m = /^(\d{1,2})[:h](\d{2})?$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 450 → "07:30". */
export const paraHora = (minutos: number) => `${dois(Math.floor(minutos / 60) % 24)}:${dois(minutos % 60)}`;

/**
 * Normaliza o que se digita ou o que o Gemini lê — "7h", "7:30", "07h30",
 * "12" — para "07:30". Devolve null se não der para entender.
 */
export function normalizarHora(texto: string): string | null {
  const limpo = texto.trim().toLowerCase().replace(/\s+/g, "").replace(/hs?$/, "h");
  const m = /^(\d{1,2})(?:[:h.](\d{2})?)?h?$/.exec(limpo);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${dois(h)}:${dois(min)}`;
}

/** "07:30" → "7h30"; "12:00" → "12h". É como se fala, e como a tela mostra. */
export function horaFalada(hora: string): string {
  const m = paraMinutos(hora);
  if (m == null) return hora;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h${dois(min)}` : `${h}h`;
}

/** Soma dias a "2026-10-02". Sem fuso: é conta de calendário. */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(a, m - 1, d + n));
  return `${data.getUTCFullYear()}-${dois(data.getUTCMonth() + 1)}-${dois(data.getUTCDate())}`;
}

/** Dia da semana de "2026-10-02", 0 = domingo. */
export function diaDaSemana(dia: string): number {
  const [a, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-10-02" → "sexta, 2 de out". */
export function diaPorExtenso(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${SEMANA[diaDaSemana(dia)]}, ${d} de ${MESES[m - 1]}`;
}

/** "2026-10-02" → "2/10". */
export function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-").map(Number);
  return `${d}/${m}`;
}

/** A refeição vale neste dia da semana? Lista vazia quer dizer todos os dias. */
export const valeNoDia = (dias: number[], semana: number) => dias.length === 0 || dias.includes(semana);

/** "domingo, 27 de set" → "Domingo, 27 de set". (O `capitalize` do CSS faria "De Set".) */
export const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
