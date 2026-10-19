import type { Prisma } from "@prisma/client";

/**
 * O que aparece nas listas: o que não foi resolvido e ainda está na caixa de
 * entrada do Gmail — mais o que espera resposta dos outros, que mora nos
 * enviados e por isso nunca está na caixa. Menos o que você adiou.
 */
export const visivel = (agora = new Date()): Prisma.ConversaWhereInput => ({
  resolvida: false,
  OR: [{ naCaixa: true }, { categoria: "aguardando" }],
  // O que você adiou volta sozinho no dia marcado.
  AND: [{ OR: [{ adiadaAte: null }, { adiadaAte: { lte: agora } }] }],
});

/** Urgente primeiro; entre iguais, o prazo mais perto; depois, o mais recente. */
export const ORDEM: Prisma.ConversaOrderByWithRelationInput[] = [
  { prioridade: "asc" },
  { prazo: { sort: "asc", nulls: "last" } },
  { ultimaData: "desc" },
];
