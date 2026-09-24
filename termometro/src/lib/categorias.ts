import type { Tipo } from "./tipos";

/**
 * Para onde o dinheiro foi.
 *
 * O saldo responde "quanto sobrou"; a categoria responde "sobrou pouco por
 * quê". São perguntas diferentes, e a segunda só tem resposta se alguém disser,
 * na hora de lançar, que aqueles R$ 90 foram mercado e não farmácia.
 *
 * Uma categoria vale para um ou mais tipos, e não para um só: "transporte" é
 * gasto do dia a dia quando é o aplicativo da esquina e é saída quando é o
 * seguro do carro. Amarrar cada categoria a uma coluna obrigaria a inventar
 * "transporte" duas vezes, com dois totais que ninguém quer separados.
 *
 * A lista mora nos ajustes, que já sincronizam entre os aparelhos — em vez de
 * uma tabela própria, que cobraria uma junção em toda leitura e deixaria linha
 * órfã a cada renomeação.
 */
export interface Categoria {
  /** Estável, e é o que fica gravado no lançamento. Renomear não o muda. */
  id: string;
  nome: string;
  /** Em quais colunas ela aparece para ser escolhida. */
  tipos: Tipo[];
}

export const CHAVE_DAS_CATEGORIAS = "categorias";

/**
 * A lista com que o app começa.
 *
 * Existe para a primeira tela não ser um formulário vazio pedindo que alguém
 * invente um sistema de classificação antes de poder lançar um almoço. São os
 * nomes que aparecem na planilha e na vida: dá para apagar, renomear e
 * acrescentar em Ajustes.
 */
export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: "salario", nome: "Salário", tipos: ["ENTRADA"] },
  { id: "freela", nome: "Freela", tipos: ["ENTRADA"] },
  { id: "reembolso", nome: "Reembolso", tipos: ["ENTRADA"] },
  { id: "resgate", nome: "Resgate", tipos: ["ENTRADA"] },

  { id: "apartamento", nome: "Apartamento", tipos: ["SAIDA", "DIARIO"] },
  { id: "fatura", nome: "Fatura", tipos: ["SAIDA"] },
  { id: "contas", nome: "Contas", tipos: ["SAIDA"] },
  { id: "investimento", nome: "Investimento", tipos: ["SAIDA"] },

  { id: "mercado", nome: "Mercado", tipos: ["DIARIO", "SAIDA"] },
  { id: "comida", nome: "Comida", tipos: ["DIARIO"] },
  { id: "transporte", nome: "Transporte", tipos: ["DIARIO", "SAIDA"] },
  { id: "saude", nome: "Saúde", tipos: ["DIARIO", "SAIDA"] },
  { id: "lazer", nome: "Lazer", tipos: ["DIARIO", "SAIDA"] },
  { id: "casa", nome: "Casa", tipos: ["DIARIO", "SAIDA"] },
  { id: "outros", nome: "Outros", tipos: ["DIARIO", "SAIDA", "ENTRADA"] },
];

/** O rótulo de quem não tem categoria — e ele precisa ter nome para aparecer nos totais. */
export const SEM_CATEGORIA = "Sem categoria";

/**
 * Lê a lista guardada nos ajustes.
 *
 * Um texto malformado devolve a lista padrão em vez de derrubar a tela: é
 * melhor mostrar categorias erradas do que não mostrar tela nenhuma, e o
 * próximo salvamento conserta.
 */
export function lerCategorias(bruto: string | undefined): Categoria[] {
  if (!bruto) return CATEGORIAS_PADRAO;
  try {
    const lido: unknown = JSON.parse(bruto);
    if (!Array.isArray(lido)) return CATEGORIAS_PADRAO;

    const limpas = lido.filter(ehCategoria);
    return limpas.length > 0 ? limpas : CATEGORIAS_PADRAO;
  } catch {
    return CATEGORIAS_PADRAO;
  }
}

function ehCategoria(v: unknown): v is Categoria {
  if (typeof v !== "object" || v === null) return false;
  const c = v as Partial<Categoria>;
  return (
    typeof c.id === "string" &&
    c.id.length > 0 &&
    typeof c.nome === "string" &&
    c.nome.length > 0 &&
    Array.isArray(c.tipos) &&
    c.tipos.length > 0
  );
}

export const escreverCategorias = (lista: Categoria[]): string => JSON.stringify(lista);

/** As que podem ser escolhidas nesta coluna, na ordem em que foram cadastradas. */
export const categoriasDoTipo = (lista: Categoria[], tipo: Tipo): Categoria[] =>
  lista.filter((c) => c.tipos.includes(tipo));

/** O nome de uma categoria guardada num lançamento, mesmo que ela já não exista. */
export function nomeDaCategoria(lista: Categoria[], id: string | null | undefined): string {
  if (!id) return SEM_CATEGORIA;
  // Uma categoria apagada não apaga o passado: o lançamento guarda o id, e o
  // id vira o nome. Some da lista de escolha, continua nos totais.
  return lista.find((c) => c.id === id)?.nome ?? id;
}

/** Um id a partir do nome, sem acento e sem espaço, para caber no lançamento. */
export function idDoNome(nome: string): string {
  return (
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "categoria"
  );
}
