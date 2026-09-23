/**
 * Os campos de texto longo são texto puro — nada de editor com barra de
 * ferramentas para a equipe aprender. Uma linha em branco separa parágrafos, um
 * link escrito vira link, e **duas estrelas** em volta deixam em negrito.
 */

export type Trecho =
  | { tipo: "texto"; valor: string }
  | { tipo: "negrito"; valor: string }
  | { tipo: "link"; valor: string; href: string };

/** Parágrafos → linhas → trechos. */
export type TextoFormatado = Trecho[][][];

const LINK = /(https?:\/\/[^\s)]+[^\s).,;:!?]|www\.[^\s)]+[^\s).,;:!?]|[^\s@()]+@[^\s@()]+\.[a-z]{2,})/gi;

function trechosDaLinha(linha: string): Trecho[] {
  const saida: Trecho[] = [];
  // Primeiro o negrito, depois os links dentro de cada pedaço.
  const pedacos = linha.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  for (const p of pedacos) {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      saida.push({ tipo: "negrito", valor: p.slice(2, -2) });
      continue;
    }
    let ultimo = 0;
    for (const m of p.matchAll(LINK)) {
      const inicio = m.index ?? 0;
      if (inicio > ultimo) saida.push({ tipo: "texto", valor: p.slice(ultimo, inicio) });
      const valor = m[0];
      const href = valor.includes("@") && !valor.includes("/")
        ? `mailto:${valor}`
        : valor.startsWith("www.") ? `https://${valor}` : valor;
      saida.push({ tipo: "link", valor, href });
      ultimo = inicio + valor.length;
    }
    if (ultimo < p.length) saida.push({ tipo: "texto", valor: p.slice(ultimo) });
  }
  return saida;
}

export function formatarTexto(bruto: string): TextoFormatado {
  return bruto
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((par) => par.trim())
    .filter(Boolean)
    .map((par) => par.split("\n").map(trechosDaLinha));
}
