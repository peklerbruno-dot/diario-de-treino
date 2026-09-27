/**
 * Horas de relógio de parede ↔ instantes em UTC.
 *
 * O Claude pensa em "amanhã às 9h" do jeito que você fala — hora de São Paulo.
 * O banco guarda o instante em UTC. A conversão passa pelo `Intl`, e não por um
 * "-3" fixo: se o horário de verão voltar, ou se o assistente for usado noutro
 * fuso (`FUSO`), a conta continua certa.
 */

export const FUSO = process.env.FUSO || "America/Sao_Paulo";

type Partes = { ano: number; mes: number; dia: number; hora: number; minuto: number };

/** As partes de um instante vistas no relógio do fuso. */
function partesNoFuso(instante: Date, fuso: string): Partes & { diaDaSemana: number } {
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
  const semana = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return {
    ano: Number(p.year),
    mes: Number(p.month),
    dia: Number(p.day),
    hora: Number(p.hour),
    minuto: Number(p.minute),
    diaDaSemana: semana,
  };
}

/** Quantos minutos o fuso está à frente de UTC naquele instante (São Paulo: -180). */
function deslocamento(instante: Date, fuso: string): number {
  const p = partesNoFuso(instante, fuso);
  const comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto);
  const semSegundos = Math.floor(instante.getTime() / 60000) * 60000;
  return (comoUtc - semSegundos) / 60000;
}

/**
 * "2026-09-28T09:00" no relógio do fuso → o instante em UTC.
 * Devolve null para texto que não seja uma data com hora.
 */
export function localParaUtc(texto: string, fuso = FUSO): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(texto.trim());
  if (!m) return null;
  const [ano, mes, dia, hora, minuto] = m.slice(1).map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59) return null;
  const ingenuo = Date.UTC(ano, mes - 1, dia, hora, minuto);
  // Duas passadas: a primeira acha o deslocamento perto da resposta, a segunda
  // corrige o caso de a resposta cair do outro lado de uma troca de horário.
  let instante = ingenuo - deslocamento(new Date(ingenuo), fuso) * 60000;
  instante = ingenuo - deslocamento(new Date(instante), fuso) * 60000;
  return new Date(instante);
}

const dois = (n: number) => String(n).padStart(2, "0");

/** O instante como "2026-09-28T09:00", no relógio do fuso. */
export function utcParaLocal(instante: Date, fuso = FUSO): string {
  const p = partesNoFuso(instante, fuso);
  return `${p.ano}-${dois(p.mes)}-${dois(p.dia)}T${dois(p.hora)}:${dois(p.minuto)}`;
}

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** "sábado, 27/09/2026, 14:05" — o que o Claude recebe como "agora". */
export function agoraPorExtenso(instante = new Date(), fuso = FUSO): string {
  const p = partesNoFuso(instante, fuso);
  return `${SEMANA[p.diaDaSemana]}, ${dois(p.dia)}/${dois(p.mes)}/${p.ano}, ${dois(p.hora)}:${dois(p.minuto)}`;
}

export const REPETICOES = ["diario", "dias-uteis", "semanal", "mensal"] as const;
export type Repeticao = (typeof REPETICOES)[number];

/**
 * A próxima vez de um lembrete que se repete, sempre depois de `agora`.
 *
 * A conta é feita no relógio do fuso — "todo dia às 8h" continua às 8h mesmo
 * que o deslocamento mude — e pula as vezes perdidas: se o app ficou fora do ar
 * três dias, o lembrete diário toca uma vez só, não três seguidas.
 *
 * Mensal no dia 31 cai no último dia dos meses mais curtos.
 */
export function proximaVez(
  quando: Date,
  repetir: Repeticao,
  agora = new Date(),
  fuso = FUSO,
): Date {
  const base = partesNoFuso(quando, fuso);
  let { ano, mes, dia } = base;
  let passo = 0;
  for (let voltas = 0; voltas < 2000; voltas++) {
    if (repetir === "mensal") {
      passo++;
      const total = base.mes - 1 + passo;
      ano = base.ano + Math.floor(total / 12);
      mes = (total % 12) + 1;
      const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      dia = Math.min(base.dia, ultimo);
    } else {
      const d = new Date(Date.UTC(ano, mes - 1, dia + (repetir === "semanal" ? 7 : 1)));
      ano = d.getUTCFullYear();
      mes = d.getUTCMonth() + 1;
      dia = d.getUTCDate();
      if (repetir === "dias-uteis" && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) continue;
    }
    const candidato = localParaUtc(
      `${ano}-${dois(mes)}-${dois(dia)}T${dois(base.hora)}:${dois(base.minuto)}`,
      fuso,
    )!;
    if (candidato > agora) return candidato;
  }
  throw new Error("proximaVez: não achou a próxima data");
}
