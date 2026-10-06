import type { Categoria } from "./categorias";
import type { Tipo } from "./tipos";

/**
 * A categoria que uma loja já teve.
 *
 * O Apple Pay entrega o nome do lugar ("Uber", "Academia CEMI"), e o app o
 * guarda como nota do lançamento. Na primeira vez que uma loja aparece, ela
 * nasce sem categoria — ninguém disse o que ela é. Depois que você classifica
 * (um toque, em Classificar, que já junta tudo por nota), a próxima compra
 * ali nasce categorizada: o app não tem lista de lojas, só a memória das suas
 * próprias decisões.
 *
 * Por isso a memória são os próprios lançamentos, e não uma tabela de "loja →
 * categoria" que alguém teria de manter: renomear ou apagar uma categoria já
 * funciona, e a decisão mais recente vale mais do que a antiga.
 */
export interface MemoriaDaNota {
  nota: string | null;
  categoria: string | null;
  tipo: Tipo;
}

/**
 * "AntonioPereiraDa", "B. B. J. Restaurante" e "UBER *TRIP" chegam com
 * maiúscula, ponto e símbolo variando; só letras e números contam.
 */
export const chaveDaLoja = (nota: string): string =>
  nota
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/**
 * Entre os lançamentos de mesmo tipo e mesma loja, a categoria que mais se
 * repete; no empate, a mais recente. `historico` vem do mais novo para o mais
 * velho. Uma categoria que já não existe na lista é ignorada: não adianta
 * lançar com um id que a pessoa apagou.
 */
export function categoriaDaLoja(
  nota: string | null | undefined,
  tipo: Tipo,
  historico: readonly MemoriaDaNota[],
  categorias: readonly Categoria[],
): string | null {
  const alvo = nota ? chaveDaLoja(nota) : "";
  if (!alvo) return null;

  const existentes = new Set(categorias.map((c) => c.id));
  const votos = new Map<string, number>();
  let melhor: string | null = null;

  for (const h of historico) {
    if (h.tipo !== tipo || !h.nota || !h.categoria || !existentes.has(h.categoria)) continue;
    if (chaveDaLoja(h.nota) !== alvo) continue;
    const n = (votos.get(h.categoria) ?? 0) + 1;
    votos.set(h.categoria, n);
    // `>` e não `>=`: no empate fica quem apareceu primeiro, o mais recente.
    if (melhor === null || n > (votos.get(melhor) ?? 0)) melhor = h.categoria;
  }
  return melhor;
}
