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
 *
 * Além das refeições e da água, saem aqui os lembretes que você cria (remédio,
 * creatina…) e, à noite, o resumo do dia.
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

export type LembreteSeu = {
  id: string;
  titulo: string;
  texto: string;
  horario: string;
  dias: number[];
  ativo: boolean;
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
  /** Quantas das refeições marcadas hoje foram "segui". */
  seguidas?: number;
  /** Água bebida hoje, em ml. */
  aguaHoje: number;
  /** Os lembretes que você criou. */
  lembretes?: LembreteSeu[];
  /** O texto do resumo da semana (só aos domingos; quem chama monta). */
  resumoDaSemana?: string;
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

  // Lembretes seus. Não dependem de plano nem de meta: tocam na hora, nos dias marcados.
  for (const l of s.lembretes ?? []) {
    const alvo = paraMinutos(l.horario);
    if (!l.ativo || alvo == null || !valeNoDia(l.dias, agora.diaDaSemana)) continue;
    if (!dentroDaJanela(agora.minutos, alvo)) continue;
    const chave = `${agora.dia}|lembrete:${l.id}`;
    if (s.enviadas.has(chave)) continue;
    avisos.push({ chave, titulo: `⏰ ${l.titulo}`, corpo: l.texto || `Lembrete das ${horaFalada(l.horario)}.`, url: "/" });
  }

  // "Como foi o almoço?": a refeição passou da hora e ninguém marcou. Um empurrão
  // só, e só para as refeições que avisam — quem desligou o aviso de uma
  // refeição não quer ouvir falar dela.
  if (ajustes.cobrarMarcacao) {
    for (const r of doDia) {
      const horario = paraMinutos(r.horario);
      if (horario == null || !r.avisar || s.marcadas.has(r.id)) continue;
      if (!dentroDaJanela(agora.minutos, horario + ajustes.cobrarDepois)) continue;
      const chave = `${agora.dia}|cobrar:${r.id}`;
      if (s.enviadas.has(chave)) continue;
      avisos.push({ chave, titulo: `Como foi o ${r.nome.toLowerCase()}?`, corpo: "Toque para marcar: segui, troquei ou pulei.", url: `/#r-${r.id}` });
    }
  }

  // Treino: pré uma hora antes, pós quando acaba.
  if (ajustes.treinoAvisos && valeNoDia(ajustes.treinoDias, agora.diaDaSemana)) {
    const inicio = paraMinutos(ajustes.treinoHora);
    if (inicio != null) {
      const momentos = [
        { tipo: "pre", alvo: inicio - 60, titulo: `🏋️ Treino às ${horaFalada(ajustes.treinoHora)} — hora do pré-treino`, corpo: ajustes.preTreino || "Uma refeição leve agora, para treinar bem." },
        { tipo: "pos", alvo: inicio + ajustes.treinoDuracao, titulo: "🏋️ Pós-treino", corpo: ajustes.posTreino || "Hora da refeição pós-treino." },
      ];
      for (const m of momentos) {
        const chave = `${agora.dia}|treino:${m.tipo}`;
        if (m.alvo < 0 || !dentroDaJanela(agora.minutos, m.alvo) || s.enviadas.has(chave)) continue;
        avisos.push({ chave, titulo: m.titulo, corpo: m.corpo, url: "/" });
      }
    }
  }

  // O resumo da semana, no domingo.
  const horaDaSemana = paraMinutos(ajustes.resumoSemanalHora);
  if (ajustes.resumoSemanal && agora.diaDaSemana === 0 && s.resumoDaSemana && horaDaSemana != null && dentroDaJanela(agora.minutos, horaDaSemana)) {
    const chave = `${agora.dia}|semana`;
    if (!s.enviadas.has(chave)) avisos.push({ chave, titulo: "Sua semana", corpo: s.resumoDaSemana, url: "/historico/relatorio" });
  }

  // O resumo da noite: uma linha sobre o dia, para fechar com a cabeça no lugar.
  const horaDoResumo = paraMinutos(ajustes.resumoHora);
  if (ajustes.resumoNoturno && horaDoResumo != null && dentroDaJanela(agora.minutos, horaDoResumo)) {
    const chave = `${agora.dia}|resumo`;
    if (!s.enviadas.has(chave) && (doDia.length > 0 || s.aguaHoje > 0)) {
      avisos.push({ chave, titulo: "Seu dia", corpo: resumoDoDia(doDia.length, s.marcadas.size, s.seguidas ?? 0, s.aguaHoje, ajustes.aguaMeta), url: `/historico/dia/${agora.dia}` });
    }
  }

  return avisos;
}

/** "4 de 5 refeições no plano · 💧 1,8 L de 2,5 L". */
export function resumoDoDia(total: number, marcadas: number, seguidas: number, agua: number, meta: number): string {
  const partes: string[] = [];
  if (total > 0) {
    const faltam = total - marcadas;
    partes.push(`${seguidas} de ${total} refeições no plano${faltam > 0 ? ` (${faltam} sem marcar)` : ""}`);
  }
  partes.push(agua >= meta ? `💧 meta batida (${litros(agua)})` : `💧 ${litros(agua)} de ${litros(meta)}`);
  return partes.join(" · ");
}
