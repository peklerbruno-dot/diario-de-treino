/**
 * Os nomes que aparecem na tela.
 *
 * O banco guarda `EM_PREPARACAO`; a pessoa lê "em preparação". Este arquivo é
 * a única ponte entre as duas coisas, e por isso é o único lugar a mexer
 * quando um nome mudar de ideia.
 */

export type Papel = "COORDENACAO" | "MEMBRO";

export const NOME_DO_PAPEL: Record<Papel, string> = {
  COORDENACAO: "Coordenação",
  MEMBRO: "Equipe",
};

export type TipoDeAtividade =
  | "PALESTRA" | "CURSO" | "OFICINA" | "WORKSHOP" | "CONGRESSO" | "SIMPOSIO"
  | "SEMINARIO" | "MESA_REDONDA" | "GRUPO_DE_ESTUDOS" | "LANCAMENTO_DE_LIVRO"
  | "MOSTRA" | "OUTRA";

export const TIPOS_DE_ATIVIDADE: TipoDeAtividade[] = [
  "PALESTRA", "CURSO", "OFICINA", "WORKSHOP", "CONGRESSO", "SIMPOSIO",
  "SEMINARIO", "MESA_REDONDA", "GRUPO_DE_ESTUDOS", "LANCAMENTO_DE_LIVRO",
  "MOSTRA", "OUTRA",
];

export const NOME_DO_TIPO: Record<TipoDeAtividade, string> = {
  PALESTRA: "Palestra",
  CURSO: "Curso",
  OFICINA: "Oficina",
  WORKSHOP: "Workshop",
  CONGRESSO: "Congresso",
  SIMPOSIO: "Simpósio",
  SEMINARIO: "Seminário",
  MESA_REDONDA: "Mesa-redonda",
  GRUPO_DE_ESTUDOS: "Grupo de estudos",
  LANCAMENTO_DE_LIVRO: "Lançamento de livro",
  MOSTRA: "Mostra",
  OUTRA: "Outra",
};

export type EstadoDaAtividade =
  | "IDEIA" | "APROVADA" | "EM_PREPARACAO" | "DIVULGACAO" | "REALIZADA" | "CANCELADA";

/** Na ordem do caminho que a atividade percorre — é assim que as telas listam. */
export const ESTADOS_DA_ATIVIDADE: EstadoDaAtividade[] = [
  "IDEIA", "APROVADA", "EM_PREPARACAO", "DIVULGACAO", "REALIZADA", "CANCELADA",
];

export const NOME_DO_ESTADO: Record<EstadoDaAtividade, string> = {
  IDEIA: "Ideia",
  APROVADA: "Aprovada",
  EM_PREPARACAO: "Em preparação",
  DIVULGACAO: "Divulgação",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

/**
 * O que cada estado quer dizer, em uma linha. Aparece na tela de cadastro,
 * porque "aprovada" e "em preparação" só são distintas se alguém combinar o
 * que distingue as duas — e essa combinação tem que morar em algum lugar.
 */
export const EXPLICACAO_DO_ESTADO: Record<EstadoDaAtividade, string> = {
  IDEIA: "Alguém propôs. Ainda não há compromisso.",
  APROVADA: "A equipe decidiu fazer. Data e responsável definidos.",
  EM_PREPARACAO: "Está sendo montada: convite, espaço, apoio.",
  DIVULGACAO: "Está de pé e já pode ser anunciada.",
  REALIZADA: "Aconteceu. Entra no relatório.",
  CANCELADA: "Não vai acontecer. Fica registrada, com o motivo.",
};

/** A cor de cada estado, em variável CSS (ver globals.css). */
export const COR_DO_ESTADO: Record<EstadoDaAtividade, string> = {
  IDEIA: "var(--fosco)",
  APROVADA: "var(--tinta-azul)",
  EM_PREPARACAO: "var(--tinta-ambar)",
  DIVULGACAO: "var(--tinta-roxo)",
  REALIZADA: "var(--tinta-verde)",
  CANCELADA: "var(--tinta-vermelha)",
};

export type EstadoDaReuniao = "AGENDADA" | "REALIZADA" | "CANCELADA";

export const NOME_DO_ESTADO_DA_REUNIAO: Record<EstadoDaReuniao, string> = {
  AGENDADA: "Agendada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

export type EstadoDoEncaminhamento = "ABERTO" | "FEITO" | "CANCELADO";

export const NOME_DO_ESTADO_DO_ENCAMINHAMENTO: Record<EstadoDoEncaminhamento, string> = {
  ABERTO: "Aberto",
  FEITO: "Feito",
  CANCELADO: "Cancelado",
};

/** Os estados que contam como "aconteceu" para o relatório. */
export const ESTADOS_QUE_CONTAM: EstadoDaAtividade[] = ["REALIZADA"];
