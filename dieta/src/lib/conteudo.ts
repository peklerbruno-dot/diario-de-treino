/**
 * O que se come numa refeição, e como isso vira texto e volta.
 *
 * Um plano de nutricionista costuma ter três camadas:
 *
 *   - **opções** da refeição inteira ("Opção 1: pão com ovo / Opção 2: iogurte
 *     com fruta");
 *   - **itens** de cada opção ("Pão integral — 2 fatias");
 *   - **substituições** de um item ("ou tapioca — 3 colheres de goma").
 *
 * Para editar no celular, o formato é um texto simples, uma coisa por linha,
 * que dá para escrever com o polegar sem formulário nenhum:
 *
 *     Opção 1:
 *     Pão integral — 2 fatias
 *     ou tapioca — 3 colheres de sopa de goma
 *     Ovo mexido — 2 unidades
 *     Opção 2:
 *     Iogurte natural — 1 pote (170 g)
 *
 * Linha que termina em ":" abre uma opção; linha que começa com "ou" é
 * substituição do item de cima; o resto é item.
 */

export type Item = { texto: string; subs: string[] };
export type Opcao = { titulo: string; itens: Item[] };
export type Conteudo = Opcao[];

const limpar = (s: string) => s.replace(/\s+/g, " ").trim();

/** "ou tapioca", "OU: tapioca", "- ou tapioca", "↳ tapioca" → "tapioca"; outra coisa → null. */
function comoSubstituicao(linha: string): string | null {
  const m = /^(?:[-•*·]\s*)?(?:ou\b[:\s]*|↳\s*|\/\s*)(.+)$/i.exec(linha);
  return m ? limpar(m[1]) : null;
}

/** "Opção 2:", "Lanche B:" → "Opção 2". Só linha curta e sem número de quantidade no fim. */
function comoTitulo(linha: string): string | null {
  if (!linha.endsWith(":") || linha.length > 40) return null;
  return limpar(linha.slice(0, -1));
}

const tirarMarcador = (linha: string) => limpar(linha.replace(/^(?:[-•*·]|\d+[.)])\s+/, ""));

/** Texto do formulário → conteúdo. Linhas vazias são ignoradas. */
export function lerTexto(texto: string): Conteudo {
  const opcoes: Conteudo = [];
  let atual: Opcao | null = null;

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = limpar(bruta);
    if (!linha) continue;

    const titulo = comoTitulo(linha);
    if (titulo != null) {
      atual = { titulo, itens: [] };
      opcoes.push(atual);
      continue;
    }

    if (!atual) {
      atual = { titulo: "", itens: [] };
      opcoes.push(atual);
    }

    const sub = comoSubstituicao(linha);
    const ultimo = atual.itens[atual.itens.length - 1];
    if (sub != null && ultimo) {
      if (sub) ultimo.subs.push(sub);
      continue;
    }

    const item = tirarMarcador(linha);
    if (item) atual.itens.push({ texto: item, subs: [] });
  }

  // Uma opção com título e nada dentro é resto de digitação, não opção.
  return opcoes.filter((o) => o.itens.length > 0);
}

/** Conteúdo → texto do formulário. `lerTexto(escreverTexto(c))` devolve `c`. */
export function escreverTexto(conteudo: Conteudo): string {
  const linhas: string[] = [];
  const comTitulo = conteudo.length > 1 || conteudo.some((o) => o.titulo);
  conteudo.forEach((o, i) => {
    if (comTitulo) linhas.push(`${o.titulo || `Opção ${i + 1}`}:`);
    for (const item of o.itens) {
      linhas.push(item.texto);
      for (const s of item.subs) linhas.push(`ou ${s}`);
    }
  });
  return linhas.join("\n");
}

/**
 * Qualquer coisa (o JSON do banco, a resposta do Gemini) → conteúdo válido.
 * O que não tiver a forma esperada some, em vez de quebrar a tela.
 */
export function normalizarConteudo(bruto: unknown): Conteudo {
  if (!Array.isArray(bruto)) return [];
  const texto = (x: unknown) => (typeof x === "string" ? limpar(x) : "");
  const opcoes: Conteudo = [];
  for (const o of bruto) {
    const op = (o ?? {}) as { titulo?: unknown; itens?: unknown };
    const itens: Item[] = [];
    for (const i of Array.isArray(op.itens) ? op.itens : []) {
      const it = (i ?? {}) as { texto?: unknown; subs?: unknown };
      const t = texto(it.texto).slice(0, 200);
      if (!t) continue;
      const subs = (Array.isArray(it.subs) ? it.subs : []).map(texto).filter(Boolean).map((s) => s.slice(0, 200));
      itens.push({ texto: t, subs });
    }
    if (itens.length) opcoes.push({ titulo: texto(op.titulo).slice(0, 40), itens });
  }
  return opcoes;
}

/**
 * O texto da notificação: o que comer, numa linha.
 *
 * A notificação do iPhone mostra umas quatro linhas antes de cortar. Com mais
 * de uma opção, vai a primeira e um "(+1 opção)": é o que dá para ler de
 * relance, e o resto está a um toque.
 */
export function resumir(conteudo: Conteudo, limite = 160): string {
  if (conteudo.length === 0) return "";
  const primeira = conteudo[0];
  let texto = primeira.itens.map((i) => i.texto).join(" · ");
  const outras = conteudo.length - 1;
  const sufixo = outras > 0 ? ` (+${outras} ${outras === 1 ? "opção" : "opções"})` : "";
  if (texto.length + sufixo.length > limite) texto = `${texto.slice(0, limite - sufixo.length - 1).trimEnd()}…`;
  return texto + sufixo;
}
