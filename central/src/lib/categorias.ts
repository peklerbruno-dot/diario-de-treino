/**
 * As categorias da triagem, agrupadas em quatro "fluxos" (a ideia do HEY):
 * o que é para você, o que espera os outros, o que é para ler com calma e o
 * que é só registro. O painel e a lista mostram os fluxos; a categoria fina
 * aparece como etiqueta em cada conversa.
 */
export const CATEGORIAS = [
  { id: "responder", nome: "Responder", fluxo: "voce", tom: "atencao", explicacao: "Alguém espera uma resposta sua." },
  { id: "acao", nome: "Ação", fluxo: "voce", tom: "alerta", explicacao: "Pede algo além de responder: assinar, enviar, pagar." },
  { id: "agenda", nome: "Agenda", fluxo: "voce", tom: "azul", explicacao: "Convites, horários a combinar." },
  { id: "financeiro", nome: "Financeiro", fluxo: "voce", tom: "ok", explicacao: "Boletos, faturas, recibos, reembolsos." },
  { id: "aguardando", nome: "Aguardando", fluxo: "esperando", tom: "neutro", explicacao: "Você escreveu e a vez é do outro." },
  { id: "ler_depois", nome: "Ler depois", fluxo: "ler", tom: "neutro", explicacao: "Newsletters, boletins, artigos." },
  { id: "informativo", nome: "Informativo", fluxo: "registro", tom: "neutro", explicacao: "Para saber; não pede nada." },
  { id: "ruido", nome: "Ruído", fluxo: "registro", tom: "neutro", explicacao: "Promoções e notificações automáticas." },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["id"];

export const IDS_DE_CATEGORIA = CATEGORIAS.map((c) => c.id) as [Categoria, ...Categoria[]];

export const categoria = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[6];

/** As que aparecem no Hoje como "precisa de você". */
export const DEPENDEM_DE_MIM: Categoria[] = ["responder", "acao", "agenda", "financeiro"];

export const FLUXOS = [
  { id: "voce", nome: "Para você", explicacao: "O que depende de você." },
  { id: "esperando", nome: "Esperando", explicacao: "Você escreveu; a vez é do outro." },
  { id: "ler", nome: "Para ler", explicacao: "Newsletters e boletins, para quando der." },
  { id: "registro", nome: "Registros", explicacao: "Confirmações, avisos e notificações." },
] as const;

export type Fluxo = (typeof FLUXOS)[number]["id"];

export const categoriasDoFluxo = (f: string): Categoria[] =>
  CATEGORIAS.filter((c) => c.fluxo === f).map((c) => c.id);

/** A classe de cor do ponto de cada tom (ver tailwind.config.ts). */
export const COR_DO_TOM: Record<string, string> = {
  atencao: "bg-atencao",
  alerta: "bg-alerta",
  azul: "bg-azul",
  ok: "bg-ok",
  neutro: "bg-regua",
};
