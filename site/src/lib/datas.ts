/**
 * Datas são texto, "2026-10-03". A data de uma peulá é o que está escrito no
 * cartaz, não um instante no tempo: guardá-la como horário com fuso é o
 * caminho para um sábado virar sexta no servidor (lição que o sistema do CEJ,
 * neste mesmo repositório, já pagou).
 */

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Data de verdade: "2026-02-31" tem o formato certo, mas não existe. */
export function ehData(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export const ehHora = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** O dia de hoje em São Paulo, no formato das datas guardadas. */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

function partes(data: string) {
  const [a, m, d] = data.split("-").map(Number) as [number, number, number];
  // Meio-dia UTC: o dia da semana não escorrega para o vizinho.
  const semana = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay();
  return { a, m, d, semana };
}

/** "sábado, 3 de outubro de 2026" */
export function dataPorExtenso(data: string, comAno = true): string {
  if (!ehData(data)) return "";
  const { a, m, d, semana } = partes(data);
  return `${DIAS[semana]}, ${d} de ${MESES[m - 1]}${comAno ? ` de ${a}` : ""}`;
}

/** "3 de outubro de 2026" */
export function dataCurta(data: string): string {
  if (!ehData(data)) return "";
  const { a, m, d } = partes(data);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Para o selo do calendário: { dia: "3", mes: "out" }. */
export function seloData(data: string): { dia: string; mes: string; semana: string } {
  if (!ehData(data)) return { dia: "?", mes: "", semana: "" };
  const { m, d, semana } = partes(data);
  return { dia: String(d), mes: MESES[m - 1]!.slice(0, 3), semana: DIAS[semana]!.replace("-feira", "") };
}

/** "14:00" → "14h"; "19:30" → "19h30". */
export function horaLegivel(hora: string): string {
  if (!ehHora(hora)) return "";
  const [h, min] = hora.split(":");
  return min === "00" ? `${Number(h)}h` : `${Number(h)}h${min}`;
}

/** Soma dias a uma data guardada. Usado só para o conteúdo inicial. */
export function somarDias(data: string, dias: number): string {
  const { a, m, d } = partes(data);
  return new Date(Date.UTC(a, m - 1, d + dias, 12)).toISOString().slice(0, 10);
}

/** O próximo sábado a partir de uma data (a própria, se já for sábado). */
export function proximoSabado(data: string): string {
  const { semana } = partes(data);
  return somarDias(data, (6 - semana + 7) % 7);
}
