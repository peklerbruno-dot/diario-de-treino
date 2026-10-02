import type { Ajustes } from "./ajustes";
import { litros } from "./ajustes";
import { type Conteudo, resumir } from "./conteudo";
import { type Agora, horaFalada, paraMinutos, valeNoDia } from "./datas";

/**
 * Que avisos saem agora?
 *
 * Um relógio de fora (o cron-job.org) chama `/api/avisos` a cada minuto, e é
 * esta função que decide o que mandar. Ela é pura — recebe o relógio, o plano,
 * o que já foi marcado e o que já foi enviado — para dar para testar cada regra
 * sem banco e sem esperar o almoço.
 *
 * Três cuidados:
 *
 *  - **Tolerância.** O cron gratuito às vezes pula um minuto, ou atrasa. Um
 *    aviso não exige cair no minuto exato: vale qualquer chamada nos
 *    `TOLERANCIA` minutos seguintes ao horário. Quem impede que ele saia duas
 *    vezes é a chave única de `AvisoEnviado`, não o relógio.
 *  - **Refeição já marcada não avisa.** Se você almoçou mais cedo e já marcou,
 *    o aviso das 12h30 seria só barulho.
 *  - **Água não atropela refeição.** Um lembrete de água a menos de 20 minutos
 *    de uma refeição é pulado: duas notificações seguidas ensinam a ignorar as
 *    duas.
 */

export const TOLERANCIA = 20;
const RESPIRO_DA_AGUA = 20;

export type RefeicaoDoPlano = {
  id: string;
  nome: string;
  horario: string;
  conteudo: Conteudo;
  dias: number[];
  avisar: boolean;
};

export type Aviso = {
  /** Única por dia e por aviso: "2026-10-02|refeicao:abc". */
  chave: string;
  titulo: string;
  corpo: string;
  /** Para onde o toque na notificação leva. */
  url: string;
};

export type Situacao = {
  agora: Agora;
  refeicoes: RefeicaoDoPlano[];
  ajustes: Ajustes;
  /** Ids das refeições já marcadas hoje (segui, troquei ou pulei). */
  marcadas: Set<string>;
  /** Água bebida hoje, em ml. */
  aguaHoje: number;
  /** Chaves de avisos que já saíram. */
  enviadas: Set<string>;
};

const dentroDaJanela = (agora: number, alvo: number) => agora >= alvo && agora - alvo < TOLERANCIA;

/** Os horários dos lembretes de água no dia, em minutos: início, início + intervalo, … até o fim. */
export function horariosDaAgua(a: Ajustes): number[] {
  const inicio = paraMinutos(a.aguaInicio);
  const fim = paraMinutos(a.aguaFim);
  if (inicio == null || fim == null || fim <= inicio || a.aguaIntervalo < 1) return [];
  const saida: number[] = [];
  for (let m = inicio; m <= fim; m += a.aguaIntervalo) saida.push(m);
  return saida;
}

/** Quanto já deveria ter bebido a esta hora, para ir no ritmo da meta. */
export function ritmoDaAgua(a: Ajustes, minutos: number): number {
  const inicio = paraMinutos(a.aguaInicio) ?? 0;
  const fim = paraMinutos(a.aguaFim) ?? 24 * 60;
  if (minutos <= inicio) return 0;
  if (minutos >= fim) return a.aguaMeta;
  return Math.round(((minutos - inicio) / (fim - inicio)) * a.aguaMeta);
}

export function refeicoesDoDia(refeicoes: RefeicaoDoPlano[], diaDaSemana: number) {
  return refeicoes
    .filter((r) => valeNoDia(r.dias, diaDaSemana))
    .sort((a, b) => (paraMinutos(a.horario) ?? 0) - (paraMinutos(b.horario) ?? 0));
}

export function avisosDevidos(s: Situacao): Aviso[] {
  const { agora, ajustes } = s;
  const avisos: Aviso[] = [];
  const doDia = refeicoesDoDia(s.refeicoes, agora.diaDaSemana);

  // Refeições.
  const alvosDasRefeicoes: number[] = [];
  for (const r of doDia) {
    const horario = paraMinutos(r.horario);
    if (horario == null) continue;
    const alvo = Math.max(0, horario - (ajustes.antecedencia || 0));
    alvosDasRefeicoes.push(alvo);
    if (!ajustes.avisarRefeicoes || !r.avisar || s.marcadas.has(r.id)) continue;
    if (!dentroDaJanela(agora.minutos, alvo)) continue;

    const chave = `${agora.dia}|refeicao:${r.id}`;
    if (s.enviadas.has(chave)) continue;
    const antes = ajustes.antecedencia > 0 ? ` em ${ajustes.antecedencia} min` : "";
    avisos.push({
      chave,
      titulo: `${r.nome}${antes} · ${horaFalada(r.horario)}`,
      corpo: resumir(r.conteudo) || "Hora da refeição.",
      url: `/#r-${r.id}`,
    });
  }

  // Água.
  if (ajustes.avisarAgua && s.aguaHoje < ajustes.aguaMeta) {
    const devido = horariosDaAgua(ajustes).find((m) => dentroDaJanela(agora.minutos, m));
    const pertoDeRefeicao =
      devido != null && alvosDasRefeicoes.some((alvo) => Math.abs(alvo - devido) < RESPIRO_DA_AGUA);
    const chave = `${agora.dia}|agua:${devido}`;
    if (devido != null && !pertoDeRefeicao && !s.enviadas.has(chave)) {
      const falta = ajustes.aguaMeta - s.aguaHoje;
      const atraso = ritmoDaAgua(ajustes, agora.minutos) - s.aguaHoje;
      avisos.push({
        chave,
        titulo: "Hora da água 💧",
        corpo:
          s.aguaHoje === 0
            ? `Nenhum copo ainda hoje. A meta é ${litros(ajustes.aguaMeta)}.`
            : atraso >= ajustes.copo
              ? `${litros(s.aguaHoje)} de ${litros(ajustes.aguaMeta)} — ${litros(atraso)} atrás do ritmo. Um copo agora?`
              : `${litros(s.aguaHoje)} de ${litros(ajustes.aguaMeta)}. Faltam ${litros(falta)}.`,
        url: "/#agua",
      });
    }
  }

  return avisos;
}
