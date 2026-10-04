/**
 * O planejamento da semana e a resposta do "posso trocar?": formatos e
 * conferência das respostas do Gemini. Fora de `leitor.ts` para dar para
 * testar sem servidor.
 */

const texto = (x: unknown, max: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");
const lista = (x: unknown) => (Array.isArray(x) ? x : []);

export type Planejamento = {
  cardapio: { dia: string; refeicoes: { nome: string; prato: string }[] }[];
  preparo: string[];
  compras: { secao: string; itens: { item: string; quantidade: string }[] }[];
  dicas: string;
};

export function normalizarPlanejamento(bruto: unknown): Planejamento | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const cardapio = lista(o.cardapio)
    .map((d) => {
      const dd = (d ?? {}) as Record<string, unknown>;
      const refeicoes = lista(dd.refeicoes)
        .map((r) => {
          const rr = (r ?? {}) as Record<string, unknown>;
          return { nome: texto(rr.nome, 60), prato: texto(rr.prato, 300) };
        })
        .filter((r) => r.nome && r.prato);
      return { dia: texto(dd.dia, 30), refeicoes };
    })
    .filter((d) => d.dia && d.refeicoes.length)
    .slice(0, 7);
  const preparo = lista(o.preparo).map((p) => texto(p, 300)).filter(Boolean).slice(0, 30);
  const compras = lista(o.compras)
    .map((sec) => {
      const ss = (sec ?? {}) as Record<string, unknown>;
      const itens = lista(ss.itens)
        .map((i) => {
          const ii = (i ?? {}) as Record<string, unknown>;
          return { item: texto(ii.item, 80), quantidade: texto(ii.quantidade, 60) };
        })
        .filter((i) => i.item);
      return { secao: texto(ss.secao, 40) || "Outros", itens };
    })
    .filter((s) => s.itens.length);
  if (cardapio.length === 0 && compras.length === 0) return null;
  return { cardapio, preparo, compras, dicas: texto(o.dicas, 600) };
}

/** A chave de um item da lista, para marcar como comprado. */
export const chaveDoItem = (secao: string, item: string) => `${secao}:${item}`.toLowerCase();

export type Veredito = "pode" | "com-ajuste" | "melhor-nao";
export type RespostaDeTroca = { veredito: Veredito; resposta: string; sugestao: string };

export function normalizarTroca(bruto: unknown): RespostaDeTroca | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  const resposta = texto(o.resposta, 800);
  if (!resposta) return null;
  const v = texto(o.veredito, 20) as Veredito;
  return { veredito: ["pode", "com-ajuste", "melhor-nao"].includes(v) ? v : "com-ajuste", resposta, sugestao: texto(o.sugestao, 400) };
}

/** JSON do Gemini, às vezes cercado de ```json. */
export function lerJson(bruto: string): unknown {
  try {
    return JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
}
