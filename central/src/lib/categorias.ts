/**
 * As categorias da triagem, na ordem em que o painel as mostra. A ordem é a da
 * pergunta "o que eu faço agora?": primeiro o que depende de você, depois o que
 * depende dos outros, por fim o que é só para saber.
 */
export const CATEGORIAS = [
  { id: "responder", nome: "Responder", icone: "🔴", explicacao: "Alguém espera uma resposta sua." },
  { id: "acao", nome: "Ação", icone: "🟠", explicacao: "Pede algo além de responder: assinar, enviar, pagar." },
  { id: "agenda", nome: "Agenda", icone: "📅", explicacao: "Convites, horários a combinar." },
  { id: "financeiro", nome: "Financeiro", icone: "💰", explicacao: "Boletos, faturas, recibos, reembolsos." },
  { id: "aguardando", nome: "Aguardando", icone: "🟡", explicacao: "Você escreveu e a vez é do outro." },
  { id: "informativo", nome: "Informativo", icone: "⚪", explicacao: "Para saber; não pede nada." },
  { id: "ler_depois", nome: "Ler depois", icone: "📰", explicacao: "Newsletters, boletins, artigos." },
  { id: "ruido", nome: "Ruído", icone: "🔇", explicacao: "Promoções e notificações automáticas." },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["id"];

export const IDS_DE_CATEGORIA = CATEGORIAS.map((c) => c.id) as [Categoria, ...Categoria[]];

export const categoria = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[5];

/** As que aparecem no painel como "precisa de você". */
export const DEPENDEM_DE_MIM: Categoria[] = ["responder", "acao", "agenda", "financeiro"];
