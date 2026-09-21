import "server-only";
import { bd } from "./bd";
import { hoje } from "./datas";

/**
 * As perguntas sobre contatos, boletins e inscrições.
 *
 * Em arquivo separado do `consultas.ts` por tamanho, e a regra de lá vale igual:
 * o que foi apagado não volta em consulta nenhuma, e quem se descadastrou não
 * entra em envio nenhum. As duas coisas moram aqui, num lugar só, porque uma
 * tela que montasse a própria consulta um dia esqueceria uma delas — e a
 * segunda, esquecida, é o tipo de erro que custa a conta de envio.
 */

const VIVO = { apagadoEm: null };

export type FiltroDeContatos = {
  busca?: string;
  vinculo?: string;
  etiquetaId?: string;
  estado?: string;
};

const ondeContato = (filtro: FiltroDeContatos) => ({
  ...VIVO,
  ...(filtro.estado ? { estado: filtro.estado as never } : {}),
  ...(filtro.vinculo ? { vinculo: filtro.vinculo as never } : {}),
  ...(filtro.etiquetaId ? { etiquetas: { some: { etiquetaId: filtro.etiquetaId } } } : {}),
  ...(filtro.busca
    ? {
        OR: [
          { nome: { contains: filtro.busca, mode: "insensitive" as const } },
          { email: { contains: filtro.busca, mode: "insensitive" as const } },
          { instituicao: { contains: filtro.busca, mode: "insensitive" as const } },
        ],
      }
    : {}),
});

export async function buscarContatos(filtro: FiltroDeContatos, quantos = 500) {
  return bd.contato.findMany({
    where: ondeContato(filtro),
    include: { etiquetas: { include: { etiqueta: true } } },
    orderBy: { nome: "asc" },
    take: quantos,
  });
}

export const quantosContatos = (filtro: FiltroDeContatos) =>
  bd.contato.count({ where: ondeContato(filtro) });

export async function contagemDaBase() {
  const [total, ativos, comConsentimento, descadastrados] = await Promise.all([
    bd.contato.count({ where: VIVO }),
    bd.contato.count({ where: { ...VIVO, estado: "ATIVO" } }),
    bd.contato.count({ where: { ...VIVO, estado: "ATIVO", consentimentoEm: { not: null } } }),
    bd.contato.count({ where: { ...VIVO, estado: "DESCADASTRADO" } }),
  ]);
  return { total, ativos, comConsentimento, descadastrados };
}

export async function contato(id: string) {
  return bd.contato.findFirst({
    where: { id, ...VIVO },
    include: {
      etiquetas: { include: { etiqueta: true } },
      participacoes: {
        include: { atividade: { select: { id: true, titulo: true, dia: true, tipo: true } } },
        orderBy: { atividade: { dia: "desc" } },
      },
    },
  });
}

export const etiquetas = () =>
  bd.etiqueta.findMany({
    include: { _count: { select: { contatos: true } } },
    orderBy: { nome: "asc" },
  });

/**
 * Quem recebe um boletim, dado o segmento.
 *
 * As três condições da LGPD estão aqui e não na tela: ativo, consentiu, não
 * apagado. É o único caminho pelo qual um envio descobre para quem mandar.
 */
export function quemRecebe(filtro: { vinculo?: string | null; etiquetaId?: string | null }) {
  return bd.contato.findMany({
    where: {
      apagadoEm: null,
      estado: "ATIVO",
      consentimentoEm: { not: null },
      ...(filtro.vinculo ? { vinculo: filtro.vinculo as never } : {}),
      ...(filtro.etiquetaId ? { etiquetas: { some: { etiquetaId: filtro.etiquetaId } } } : {}),
    },
    select: { id: true, nome: true, email: true, chave: true },
    orderBy: { nome: "asc" },
  });
}

export const boletins = () =>
  bd.boletim.findMany({
    include: {
      _count: { select: { envios: true } },
      atividades: { select: { atividadeId: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 100,
  });

export async function boletim(id: string) {
  return bd.boletim.findUnique({
    where: { id },
    include: {
      atividades: {
        include: { atividade: true },
        orderBy: { ordem: "asc" },
      },
    },
  });
}

/** Como vai o envio: o que já saiu, o que falta, o que falhou. */
export async function andamentoDoEnvio(boletimId: string) {
  const [pendentes, enviados, falhas] = await Promise.all([
    bd.envioDeBoletim.count({ where: { boletimId, estado: "PENDENTE" } }),
    bd.envioDeBoletim.count({ where: { boletimId, estado: "ENVIADO" } }),
    bd.envioDeBoletim.findMany({
      where: { boletimId, estado: "FALHOU" },
      include: { contato: { select: { nome: true, email: true } } },
      take: 20,
    }),
  ]);
  return { pendentes, enviados, falhas, total: pendentes + enviados + falhas.length };
}

/** As atividades que faz sentido anunciar: daqui para a frente, e já de pé. */
export const atividadesAnunciaveis = (de = hoje()) =>
  bd.atividade.findMany({
    where: {
      apagadaEm: null,
      dia: { gte: de },
      estado: { in: ["APROVADA", "EM_PREPARACAO", "DIVULGACAO"] },
    },
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
  });

/**
 * A agenda pública.
 *
 * O filtro é a própria situação da atividade: **divulgação** já quer dizer "está
 * de pé e pode ser anunciada". Não inventei uma segunda chavinha de "publicar"
 * — duas chaves para a mesma decisão viram duas verdades, e um dia a atividade
 * está divulgada aqui e escondida lá.
 */
export const agendaPublica = (de = hoje()) =>
  bd.atividade.findMany({
    where: { apagadaEm: null, dia: { gte: de }, estado: "DIVULGACAO" },
    include: { convidados: { orderBy: { ordem: "asc" } } },
    orderBy: [{ dia: "asc" }, { hora: "asc" }],
    take: 50,
  });

export const inscritos = (atividadeId: string) =>
  bd.participacao.findMany({
    where: { atividadeId },
    include: { contato: { select: { id: true, nome: true, email: true, vinculo: true } } },
    orderBy: { contato: { nome: "asc" } },
  });
