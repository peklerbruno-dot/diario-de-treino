/**
 * Datas de caderno: "2026-01-14", texto puro.
 *
 * Nada de `Date` para representar um dia. Um Date carrega hora e fuso, e é
 * assim que um lançamento do dia 1º às 21h em São Paulo vira dia 2 no servidor.
 * O dia aqui é o que está escrito, e pronto.
 */

export const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

export const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const;

const DIAS_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"] as const;
const DIAS_SEMANA_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

/** Quantos dias tem o mês (1 a 12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

export function montarData(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function partesDaData(data: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia };
}

/**
 * Um dia que existe no calendário — e num ano que faz sentido.
 *
 * "2026-02-31" tem a forma certa e não existe; "0206-05-10" existe e é um dedo
 * errado que arrastaria a corrente de anos por dezoito séculos. As três portas
 * de entrada (folha, atalho da Siri, /api/sync) usam ESTA regra, para nenhuma
 * aceitar o que as outras recusam.
 */
export function dataExiste(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const { ano, mes, dia } = partesDaData(data);
  return (
    ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes)
  );
}

/** Hoje segundo o relógio do aparelho, que é o relógio que a pessoa vê. */
export function hoje(): string {
  const agora = new Date();
  return montarData(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

/** 0 = domingo. */
export function diaDaSemana(data: string): number {
  const { ano, mes, dia } = partesDaData(data);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function nomeDoDiaDaSemana(data: string, curto = false): string {
  const i = diaDaSemana(data);
  return curto ? DIAS_SEMANA_CURTOS[i] : DIAS_SEMANA[i];
}

export function ehFimDeSemana(data: string): boolean {
  const i = diaDaSemana(data);
  return i === 0 || i === 6;
}

/** "14 de janeiro de 2026" */
export function porExtenso(data: string): string {
  const { ano, mes, dia } = partesDaData(data);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** "14/01" */
export function curta(data: string): string {
  const { mes, dia } = partesDaData(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;
}

export function nomeDoMes(mes: number): string {
  return MESES[mes - 1];
}

/**
 * A mesma data, N meses adiante, com o dia preso ao tamanho do mês: 31 de
 * janeiro + 1 mês é 28 (ou 29) de fevereiro, não 3 de março. É a conta das
 * parcelas — "10x no dia 15" cai todo mês no 15, e um dia 31 desce quando o
 * mês não o tem, como os fixos já fazem.
 */
export function mesesDepois(data: string, meses: number): string {
  const { ano, mes, dia } = partesDaData(data);
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  return montarData(novoAno, novoMes, Math.min(dia, diasNoMes(novoAno, novoMes)));
}

export function somarDias(data: string, dias: number): string {
  const { ano, mes, dia } = partesDaData(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return montarData(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}
