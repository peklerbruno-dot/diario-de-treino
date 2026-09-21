/**
 * Datas de caderno: "2026-06-03", texto puro. Horas idem: "19:00".
 *
 * Nada de `Date` para representar o dia de uma atividade. Um `Date` carrega
 * hora e fuso, e é assim que uma palestra das 19h do dia 3, em São Paulo,
 * chega ao servidor como 22h — e, se fosse às 21h30, como *dia 4*. A data de
 * uma palestra não é um instante no tempo físico: é o que está escrito no
 * cartaz.
 *
 * `Date` aparece aqui em dois lugares e só neles: para descobrir que dia é hoje
 * em São Paulo, e para andar de um dia para o outro (somar dias, montar o mês).
 * Nos dois casos ele entra e sai como texto.
 */

export const FUSO = "America/Sao_Paulo";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const SEMANA_CURTA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/**
 * Que dia é hoje — em São Paulo, não em UTC.
 *
 * O servidor da Vercel roda em UTC. Sem esta tradução, das 21h à meia-noite o
 * sistema acharia que já é amanhã: uma atividade de hoje à noite apareceria
 * como "ontem" para quem estivesse justamente a caminho dela.
 *
 * O truque do `en-CA` é que esse formato já escreve a data como AAAA-MM-DD.
 */
export function hoje(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A hora agora, em São Paulo: "14:35". */
export function agora(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function ehDiaValido(dia: string | null | undefined): dia is string {
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const [a, m, d] = dia.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= diasNoMes(a, m);
}

export function ehHoraValida(hora: string | null | undefined): hora is string {
  if (!hora) return false;
  const bate = /^(\d{1,2}):(\d{2})$/.exec(hora);
  if (!bate) return false;
  return Number(bate[1]) <= 23 && Number(bate[2]) <= 59;
}

/** "9:5" e "9h30" viram "09:05" e "09:30"; o que não for hora vira nulo. */
export function normalizarHora(bruto: string | null | undefined): string | null {
  const texto = (bruto ?? "").trim().replace(/[hH]/, ":").replace(/[.,]/, ":");
  if (!texto) return null;
  const bate = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(texto);
  if (!bate) return null;
  const h = Number(bate[1]);
  const m = Number(bate[2] ?? "0");
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export const partes = (dia: string) => {
  const [ano, mes, d] = dia.split("-").map(Number);
  return { ano, mes, dia: d };
};

/** O mês a que o dia pertence: "2026-06-03" → "2026-06". */
export const mesDe = (dia: string) => dia.slice(0, 7);

/** 0 = domingo. */
export function diaDaSemana(dia: string): number {
  const { ano, mes, dia: d } = partes(dia);
  return new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();
}

export function somarDias(dia: string, quantos: number): string {
  const { ano, mes, dia: d } = partes(dia);
  const data = new Date(Date.UTC(ano, mes - 1, d + quantos));
  return data.toISOString().slice(0, 10);
}

/** Quantos dias de `de` até `ate`. Negativo quer dizer que `ate` já passou. */
export function distanciaEmDias(de: string, ate: string): number {
  const a = new Date(`${de}T00:00:00Z`).getTime();
  const b = new Date(`${ate}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "3 de junho de 2026" */
export function porExtenso(dia: string): string {
  const { ano, mes, dia: d } = partes(dia);
  return `${d} de ${MESES[mes - 1]} de ${ano}`;
}

/** "quarta, 3 de junho" — o dia da semana importa mais que o ano quando é perto. */
export function comDiaDaSemana(dia: string): string {
  const { mes, dia: d } = partes(dia);
  return `${SEMANA[diaDaSemana(dia)]}, ${d} de ${MESES[mes - 1]}`;
}

/** "03/06/2026" */
export function porBarras(dia: string): string {
  const { ano, mes, dia: d } = partes(dia);
  return `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

/** "3 jun" */
export function curto(dia: string): string {
  const { mes, dia: d } = partes(dia);
  return `${d} ${MESES_CURTOS[mes - 1]}`;
}

/**
 * Maiúscula na primeira letra, e só nela.
 *
 * O `capitalize` do CSS põe maiúscula em toda palavra, e "outubro de 2026"
 * vira "Outubro De 2026" — com um "De" no meio que ninguém escreveria.
 */
export const comMaiuscula = (texto: string) =>
  texto.charAt(0).toLocaleUpperCase("pt-BR") + texto.slice(1);

export const nomeDoMes = (mes: number) => MESES[mes - 1];
export const nomeCurtoDoDiaDaSemana = (indice: number) => SEMANA_CURTA[indice];

/** "junho de 2026", a partir de "2026-06". */
export function nomeDoMesCompleto(mesAno: string): string {
  const [ano, mes] = mesAno.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

export function mesSeguinte(mesAno: string): string {
  const [ano, mes] = mesAno.split("-").map(Number);
  return mes === 12 ? `${ano + 1}-01` : `${ano}-${String(mes + 1).padStart(2, "0")}`;
}

export function mesAnterior(mesAno: string): string {
  const [ano, mes] = mesAno.split("-").map(Number);
  return mes === 1 ? `${ano - 1}-12` : `${ano}-${String(mes - 1).padStart(2, "0")}`;
}

/**
 * Como se diz um prazo para quem está olhando a lista.
 *
 * "2026-06-10" não diz nada; "em 3 dias" diz. E o atraso é dito como atraso —
 * "há 2 dias" —, porque é a única informação da lista que pede ação hoje.
 */
export function comoPrazo(prazo: string, referencia = hoje()): string {
  const dias = distanciaEmDias(referencia, prazo);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias < 0) return `há ${Math.abs(dias)} dias`;
  if (dias <= 14) return `em ${dias} dias`;
  return curto(prazo);
}

/**
 * A grade do mês, do domingo da primeira semana ao sábado da última.
 *
 * Devolve sempre semanas inteiras, porque um calendário com a primeira linha
 * pela metade não é um calendário — é uma lista com buracos. Os dias que caem
 * fora do mês vêm marcados com `doMes: false`, para a tela apagá-los.
 */
export function gradeDoMes(mesAno: string): { dia: string; doMes: boolean }[][] {
  const [ano, mes] = mesAno.split("-").map(Number);
  const primeiro = `${mesAno}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));

  const semanas: { dia: string; doMes: boolean }[][] = [];
  let cursor = inicio;
  const ultimo = `${mesAno}-${String(diasNoMes(ano, mes)).padStart(2, "0")}`;

  while (distanciaEmDias(cursor, ultimo) >= 0) {
    const semana = Array.from({ length: 7 }, (_, i) => {
      const dia = somarDias(cursor, i);
      return { dia, doMes: mesDe(dia) === mesAno };
    });
    semanas.push(semana);
    cursor = somarDias(cursor, 7);
  }
  return semanas;
}
