import "server-only";
import { bd } from "./bd";
import { hoje, somarDias } from "./datas";
import type { EventoDaAgenda } from "./agenda";

/**
 * As perguntas que as telas fazem ao banco.
 *
 * Ficam aqui, e não dentro de cada página, por dois motivos: a mesma pergunta é
 * feita de lugares diferentes (o painel e o calendário querem as atividades do
 * mês), e porque é aqui que mora a regra que é fácil esquecer — **o que foi
 * apagado não volta em consulta nenhuma**. Uma tela que montasse a própria
 * consulta um dia esqueceria o `apagadaEm: null`, e a atividade apagada
 * reapareceria só naquela tela.
 */

const VIVA = { apagadaEm: null };

export const COM_RESPONSAVEL = {
  responsavel: { select: { id: true, nome: true } },
} as const;

export async function atividadesEntre(de: string, ate: string) {
  return bd.atividade.findMany({
    where: { ...VIVA, dia: { gte: de, lte: ate } },
    include: { ...COM_RESPONSAVEL, convidados: { orderBy: { ordem: "asc" } } },
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
  });
}

export async function reunioesEntre(de: string, ate: string) {
  return bd.reuniao.findMany({
    where: { ...VIVA, dia: { gte: de, lte: ate } },
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
  });
}

/** O que vem pela frente — é com isso que o painel abre. */
export async function proximasAtividades(quantas = 6, de = hoje()) {
  return bd.atividade.findMany({
    where: { ...VIVA, dia: { gte: de }, estado: { notIn: ["CANCELADA", "REALIZADA"] } },
    include: COM_RESPONSAVEL,
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
    take: quantas,
  });
}

/**
 * O que aconteceu e ainda está marcado como se não tivesse acontecido.
 *
 * É a pergunta que o sistema faz **por** você: sem ela, o relatório de dezembro
 * sai faltando as palestras de março que ninguém voltou para marcar como
 * realizadas. Uma semana de carência, porque marcar no dia seguinte é cobrança
 * demais.
 */
export async function atividadesEsperandoFecho(hojeStr = hoje()) {
  return bd.atividade.findMany({
    where: {
      ...VIVA,
      dia: { lt: somarDias(hojeStr, -7) },
      estado: { in: ["IDEIA", "APROVADA", "EM_PREPARACAO", "DIVULGACAO"] },
    },
    include: COM_RESPONSAVEL,
    orderBy: { dia: "desc" },
    take: 20,
  });
}

export async function proximasReunioes(quantas = 3, de = hoje()) {
  return bd.reuniao.findMany({
    where: { ...VIVA, dia: { gte: de }, estado: { not: "CANCELADA" } },
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
    take: quantas,
  });
}

export const COM_ORIGEM = {
  responsavel: { select: { id: true, nome: true } },
  reuniao: { select: { id: true, titulo: true, dia: true } },
  atividade: { select: { id: true, titulo: true } },
} as const;

export async function encaminhamentos(filtro: {
  responsavelId?: string;
  incluirFechados?: boolean;
}) {
  return bd.encaminhamento.findMany({
    where: {
      apagadoEm: null,
      ...(filtro.responsavelId ? { responsavelId: filtro.responsavelId } : {}),
      ...(filtro.incluirFechados ? {} : { estado: "ABERTO" }),
    },
    include: COM_ORIGEM,
    orderBy: [{ prazo: "asc" }, { criadoEm: "asc" }],
  });
}

export async function equipe(incluirInativas = false) {
  return bd.pessoa.findMany({
    where: incluirInativas ? {} : { ativa: true },
    orderBy: [{ ativa: "desc" }, { nome: "asc" }],
  });
}

/** Só quem pode receber um encaminhamento ou responder por uma atividade. */
export async function equipeAtiva() {
  return bd.pessoa.findMany({
    where: { ativa: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
}

/**
 * Tudo o que o calendário do Google deve mostrar.
 *
 * Um ano para trás e dois para a frente. Não é o histórico inteiro de propósito:
 * o Google rebusca o arquivo o dia todo, e não faz sentido reenviar a palestra
 * de 2019 a cada meia hora pelo resto da vida.
 */
export async function eventosDaAgenda(hojeStr = hoje()): Promise<EventoDaAgenda[]> {
  const de = somarDias(hojeStr, -365);
  const ate = somarDias(hojeStr, 730);

  const [atividades, reunioes] = await Promise.all([
    bd.atividade.findMany({
      where: { ...VIVA, dia: { gte: de, lte: ate } },
      include: { ...COM_RESPONSAVEL, convidados: { orderBy: { ordem: "asc" } } },
    }),
    bd.reuniao.findMany({ where: { ...VIVA, dia: { gte: de, lte: ate } } }),
  ]);

  const deAtividades: EventoDaAgenda[] = atividades.map((a) => ({
    uid: `atividade-${a.id}@cej.usp.br`,
    titulo: a.titulo,
    dia: a.dia,
    hora: a.hora,
    diaFinal: a.diaFinal,
    horaFinal: a.horaFinal,
    local: a.local,
    descricao: [
      a.resumo,
      a.convidados.length
        ? `Com ${a.convidados.map((c) => c.nome).join(", ")}.`
        : null,
      a.responsavel ? `Responsável: ${a.responsavel.nome}.` : null,
      a.linkDeInscricao ? `Inscrições: ${a.linkDeInscricao}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || null,
    cancelado: a.estado === "CANCELADA",
  }));

  const deReunioes: EventoDaAgenda[] = reunioes.map((r) => ({
    uid: `reuniao-${r.id}@cej.usp.br`,
    titulo: r.titulo,
    dia: r.dia,
    hora: r.hora,
    diaFinal: null,
    horaFinal: null,
    local: r.local,
    descricao: r.pauta ? `Pauta:\n${r.pauta}` : null,
    cancelado: r.estado === "CANCELADA",
    prefixo: "Reunião",
  }));

  return [...deAtividades, ...deReunioes];
}

/**
 * A lista de atividades com os filtros da tela.
 *
 * `mode: "insensitive"` na busca: ninguém digita "Simpósio" com maiúscula ao
 * procurar. O acento continua contando — procurar "simposio" não acha
 * "Simpósio" —, e resolver isso exigiria uma extensão do Postgres; por ora, a
 * busca acha por qualquer pedaço do título, que já cobre o uso real.
 */
export async function buscarAtividades(filtro: {
  estado?: string;
  ano?: string;
  busca?: string;
  /** "abertas" esconde o que já foi realizado ou cancelado. */
  apenasAbertas?: boolean;
}) {
  const ehEstado = (v: string | undefined) =>
    v && ["IDEIA", "APROVADA", "EM_PREPARACAO", "DIVULGACAO", "REALIZADA", "CANCELADA"].includes(v);

  return bd.atividade.findMany({
    where: {
      ...VIVA,
      ...(ehEstado(filtro.estado) ? { estado: filtro.estado as never } : {}),
      ...(filtro.apenasAbertas ? { estado: { notIn: ["REALIZADA", "CANCELADA"] } } : {}),
      ...(filtro.ano ? { dia: { gte: `${filtro.ano}-01-01`, lte: `${filtro.ano}-12-31` } } : {}),
      ...(filtro.busca ? { titulo: { contains: filtro.busca, mode: "insensitive" } } : {}),
    },
    include: COM_RESPONSAVEL,
    orderBy: [{ dia: "desc" }, { hora: "desc" }],
    take: 300,
  });
}

/** Os anos em que há alguma atividade — para o filtro não oferecer ano vazio. */
export async function anosComAtividade(): Promise<string[]> {
  const linhas = await bd.atividade.findMany({
    where: VIVA,
    select: { dia: true },
    distinct: ["dia"],
  });
  return [...new Set(linhas.map((l) => l.dia.slice(0, 4)))].sort().reverse();
}

export async function atividade(id: string) {
  return bd.atividade.findFirst({
    where: { id, apagadaEm: null },
    include: {
      ...COM_RESPONSAVEL,
      convidados: { orderBy: { ordem: "asc" } },
      encaminhamentos: {
        where: { apagadoEm: null },
        include: { responsavel: { select: { nome: true } } },
        orderBy: [{ estado: "asc" }, { prazo: "asc" }],
      },
    },
  });
}

export async function reuniao(id: string) {
  return bd.reuniao.findFirst({
    where: { id, apagadaEm: null },
    include: {
      convocou: { select: { nome: true } },
      presencas: { include: { pessoa: { select: { id: true, nome: true } } } },
      encaminhamentos: {
        where: { apagadoEm: null },
        include: { responsavel: { select: { nome: true } } },
        orderBy: [{ estado: "asc" }, { prazo: "asc" }],
      },
    },
  });
}
