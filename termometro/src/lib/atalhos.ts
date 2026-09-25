import type { Tipo } from "./tipos";

/**
 * Os botões de lançamento rápido da tela Hoje.
 *
 * Quase todo gasto do dia a dia é repetido: o mesmo almoço, o mesmo café, a
 * mesma condução. Lançar cada um custa hoje quatro toques — abrir, escolher a
 * coluna, escolher a categoria, escrever a nota — e só o valor muda. Um atalho
 * guarda as três respostas que não mudam e deixa só a que muda.
 *
 * Ele **não lança sozinho**: abre a folha de sempre, já preenchida. Um botão
 * que grava direto seria um toque mais curto e um jeito novo de registrar R$ 40
 * sem querer, sem ver e sem poder conferir antes.
 *
 * Mora em `Ajuste`, a mesma tabela das categorias, pelo mesmo motivo: é uma
 * lista curta que sincroniza junto com o resto e não vale uma junção por
 * leitura. Ver o comentário de `Lancamento.categoria` no schema.
 */
export interface AtalhoFixo {
  /** Estável. Renomear o botão não o muda. */
  id: string;
  /** O que aparece escrito no botão: "Almoço FFLCH", "Café". */
  titulo: string;
  /** A categoria que o lançamento nasce com. Nulo é um atalho sem categoria. */
  categoriaId: string | null;
  /** A coluna. Quase sempre diário — é para onde vai o gasto repetido. */
  tipo: Tipo;
  /** A observação que já vem escrita. Vazia é uma resposta válida. */
  observacaoPadrao: string;
  /** O valor sugerido, quando ele é sempre o mesmo. Nulo deixa o campo em branco. */
  valorPadraoCents: number | null;
}

export const CHAVE_DOS_ATALHOS = "atalhos";

/**
 * Com o que a fileira começa.
 *
 * Um recurso que nasce invisível não é usado: uma fileira vazia na tela Hoje
 * não conta a ninguém que dá para montar botões. Estes três são genéricos de
 * propósito — são palpites, e palpite serve para ser apagado e trocado pelo
 * almoço de verdade de quem usa.
 */
export const ATALHOS_PADRAO: AtalhoFixo[] = [
  {
    id: "almoco",
    titulo: "Almoço",
    categoriaId: "comida",
    tipo: "DIARIO",
    observacaoPadrao: "Almoço",
    valorPadraoCents: null,
  },
  {
    id: "mercado",
    titulo: "Mercado",
    categoriaId: "mercado",
    tipo: "DIARIO",
    observacaoPadrao: "Mercado",
    valorPadraoCents: null,
  },
  {
    id: "transporte",
    titulo: "Condução",
    categoriaId: "transporte",
    tipo: "DIARIO",
    observacaoPadrao: "Condução",
    valorPadraoCents: null,
  },
];

/**
 * Lê a lista guardada no ajuste.
 *
 * A diferença entre "nunca mexeu" e "apagou todos" é de propósito: `undefined`
 * é a primeira abertura do app e recebe os palpites; uma lista vazia é uma
 * decisão de quem não quer a fileira, e devolvê-la vazia é o que faz os botões
 * ficarem apagados depois de apagados. (As categorias fazem o contrário, e ali
 * está certo: um app sem categoria nenhuma não classifica nada.)
 *
 * Texto malformado devolve a lista padrão em vez de derrubar a tela Hoje.
 */
export function lerAtalhos(bruto: string | undefined): AtalhoFixo[] {
  if (bruto === undefined) return ATALHOS_PADRAO;
  try {
    const lido: unknown = JSON.parse(bruto);
    if (!Array.isArray(lido)) return ATALHOS_PADRAO;
    return lido.filter(ehAtalho);
  } catch {
    return ATALHOS_PADRAO;
  }
}

function ehAtalho(v: unknown): v is AtalhoFixo {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Partial<AtalhoFixo>;
  return (
    typeof a.id === "string" &&
    a.id.length > 0 &&
    typeof a.titulo === "string" &&
    a.titulo.trim().length > 0 &&
    (a.tipo === "ENTRADA" || a.tipo === "SAIDA" || a.tipo === "DIARIO") &&
    (a.categoriaId === null || typeof a.categoriaId === "string") &&
    (a.valorPadraoCents === null || typeof a.valorPadraoCents === "number")
  );
}

export const escreverAtalhos = (lista: AtalhoFixo[]): string => JSON.stringify(lista);

/**
 * Um id para um atalho novo, que não pise no de ninguém.
 *
 * Nasce do título, como o das categorias, porque um id legível é o que salva
 * quem um dia for ler o backup em JSON. Dois botões podem se chamar igual — o
 * "Almoço" da semana e o "Almoço" de domingo —, e aí o segundo ganha um número.
 */
export function idParaAtalho(lista: readonly AtalhoFixo[], titulo: string): string {
  const base =
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "atalho";

  if (!lista.some((a) => a.id === base)) return base;
  for (let n = 2; ; n++) {
    const tentativa = `${base}-${n}`;
    if (!lista.some((a) => a.id === tentativa)) return tentativa;
  }
}

/** O que a folha de lançamento já vem preenchida quando o atalho é tocado. */
export interface PartidaDoAtalho {
  tipo: Tipo;
  categoria: string | null;
  nota: string;
  valorCents: number | null;
}

/**
 * Traduz o atalho no estado inicial da folha.
 *
 * O valor fica de fora quando o atalho não sugere nenhum: um campo em branco
 * pede o número, e um campo com zero convida a salvar um lançamento de zero.
 */
export function partidaDoAtalho(atalho: AtalhoFixo): PartidaDoAtalho {
  return {
    tipo: atalho.tipo,
    categoria: atalho.categoriaId,
    nota: atalho.observacaoPadrao.trim(),
    valorCents:
      atalho.valorPadraoCents !== null && atalho.valorPadraoCents > 0
        ? atalho.valorPadraoCents
        : null,
  };
}
