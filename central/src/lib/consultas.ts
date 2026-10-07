import type { Prisma } from "@prisma/client";

/**
 * O que aparece nas listas: o que não foi resolvido e ainda está na caixa de
 * entrada do Gmail — mais o que espera resposta dos outros, que mora nos
 * enviados e por isso nunca está na caixa.
 */
export const VISIVEL: Prisma.ConversaWhereInput = {
  resolvida: false,
  OR: [{ naCaixa: true }, { categoria: "aguardando" }],
};

/** Urgente primeiro; entre iguais, o prazo mais perto; depois, o mais recente. */
export const ORDEM: Prisma.ConversaOrderByWithRelationInput[] = [
  { prioridade: "asc" },
  { prazo: { sort: "asc", nulls: "last" } },
  { ultimaData: "desc" },
];
