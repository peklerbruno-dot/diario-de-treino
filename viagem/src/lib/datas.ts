/**
 * Datas como texto "AAAA-MM-DD" — ver o topo do schema. Toda conta de dias
 * é feita ao meio-dia UTC, que é longe o bastante da meia-noite para nenhum
 * fuso empurrar a data para o dia vizinho.
 */

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const ehData = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(meioDia(s).getTime());

const meioDia = (s: string) => new Date(`${s}T12:00:00Z`);
const paraTexto = (d: Date) => d.toISOString().slice(0, 10);

export function somarDias(s: string, n: number): string {
  const d = meioDia(s);
  d.setUTCDate(d.getUTCDate() + n);
  return paraTexto(d);
}

/** Todos os dias de `inicio` a `fim`, inclusive. Com teto, para uma data errada não gerar mil dias. */
export function diasEntre(inicio: string, fim: string, teto = 120): string[] {
  if (!ehData(inicio) || !ehData(fim) || fim < inicio) return ehData(inicio) ? [inicio] : [];
  const saida: string[] = [];
  for (let d = inicio; d <= fim && saida.length < teto; d = somarDias(d, 1)) saida.push(d);
  return saida;
}

export const diferencaEmDias = (de: string, ate: string) =>
  Math.round((meioDia(ate).getTime() - meioDia(de).getTime()) / 86_400_000);

/** "sexta, 4 de dezembro" */
export function porExtenso(s: string): string {
  const d = meioDia(s);
  return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

/** "sex 4 dez" */
export function curta(s: string): string {
  const d = meioDia(s);
  return `${DIAS_CURTOS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES_CURTOS[d.getUTCMonth()]}`;
}

/** "4 a 18 de dezembro de 2026", "28 de dezembro a 3 de janeiro de 2027" */
export function periodo(inicio: string, fim: string): string {
  const a = meioDia(inicio);
  const b = meioDia(fim);
  const mesmoAno = a.getUTCFullYear() === b.getUTCFullYear();
  const mesmoMes = mesmoAno && a.getUTCMonth() === b.getUTCMonth();
  if (mesmoMes) return `${a.getUTCDate()} a ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]} de ${b.getUTCFullYear()}`;
  const ini = `${a.getUTCDate()} de ${MESES[a.getUTCMonth()]}${mesmoAno ? "" : ` de ${a.getUTCFullYear()}`}`;
  return `${ini} a ${b.getUTCDate()} de ${MESES[b.getUTCMonth()]} de ${b.getUTCFullYear()}`;
}

/** Hoje, no fuso de quem viaja. O padrão é o da Cidade do México. */
export function hoje(fuso = process.env.FUSO || "America/Mexico_City"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export const ehHora = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
