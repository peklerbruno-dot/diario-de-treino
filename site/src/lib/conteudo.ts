import "server-only";
import { Prisma } from "@prisma/client";
import { bd } from "./bd";
import { BLOCOS, COLECOES, type ChaveBloco, type Dados, type TipoItem } from "./esquema";
import { BLOCOS_PADRAO, itensIniciais } from "./padrao";
import { hojeEmSaoPaulo } from "./datas";

export type ItemSite = { id: string; tipo: TipoItem; oculto: boolean; dados: Dados; ordem: number };

// ---------------------------------------------------------------------------
// Primeira abertura
// ---------------------------------------------------------------------------

const MARCA = "_semeado";
let jaConferido = false;

/**
 * Na primeira vez que o site abre com o banco vazio, põe no ar os pilares, as
 * shichvot e a agenda de exemplo — para ninguém encontrar um site em branco.
 * A marca impede que um item apagado de propósito volte sozinho.
 */
async function garantirConteudoInicial(): Promise<void> {
  if (jaConferido) return;
  const marca = await bd.bloco.findUnique({ where: { chave: MARCA }, select: { chave: true } });
  if (!marca) {
    try {
      await bd.$transaction(async (tx) => {
        await tx.bloco.create({ data: { chave: MARCA, dados: {}, atualizadoPor: "site" } });
        await tx.item.createMany({
          data: itensIniciais(hojeEmSaoPaulo()).map((it, i) => ({
            tipo: it.tipo,
            dados: it.dados,
            ordem: i,
            atualizadoPor: "site",
          })),
        });
      });
    } catch (e) {
      // Duas visitas ao mesmo tempo no primeiro minuto: a outra já semeou.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
  }
  jaConferido = true;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

function comoDados(v: Prisma.JsonValue | undefined): Dados {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const saida: Dados = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === "string") saida[k] = x;
  return saida;
}

/** Os blocos pedidos, cada um com o texto inicial por baixo do que já foi editado. */
export async function lerBlocos<K extends ChaveBloco>(chaves: K[]): Promise<Record<K, Dados>> {
  const linhas = await bd.bloco.findMany({ where: { chave: { in: chaves } } });
  const saida = {} as Record<K, Dados>;
  for (const chave of chaves) {
    const salvo = comoDados(linhas.find((l) => l.chave === chave)?.dados);
    const base: Dados = {};
    for (const c of BLOCOS[chave].campos) base[c.nome] = salvo[c.nome] ?? BLOCOS_PADRAO[chave][c.nome] ?? "";
    saida[chave] = base;
  }
  return saida;
}

function ordenar(tipo: TipoItem, itens: ItemSite[]): ItemSite[] {
  if (COLECOES[tipo].ordenacao === "manual") return itens.sort((a, b) => a.ordem - b.ordem);
  const porData = (a: ItemSite, b: ItemSite) =>
    `${a.dados.data ?? ""} ${a.dados.hora ?? ""}`.localeCompare(`${b.dados.data ?? ""} ${b.dados.hora ?? ""}`);
  // Agenda: a mais próxima primeiro. Notícias: a mais nova primeiro.
  return tipo === "noticia" ? itens.sort((a, b) => porData(b, a)) : itens.sort(porData);
}

/** Os itens de uma lista. A equipe vê também os escondidos; o visitante, não. */
export async function listar(tipo: TipoItem, equipe: boolean): Promise<ItemSite[]> {
  await garantirConteudoInicial();
  const linhas = await bd.item.findMany({
    where: { tipo, apagadoEm: null, ...(equipe ? {} : { oculto: false }) },
  });
  return ordenar(
    tipo,
    linhas.map((l) => ({ id: l.id, tipo, oculto: l.oculto, ordem: l.ordem, dados: comoDados(l.dados) })),
  );
}

export async function lerItem(tipo: TipoItem, id: string, equipe: boolean): Promise<ItemSite | null> {
  const l = await bd.item.findFirst({ where: { id, tipo, apagadoEm: null, ...(equipe ? {} : { oculto: false }) } });
  return l ? { id: l.id, tipo, oculto: l.oculto, ordem: l.ordem, dados: comoDados(l.dados) } : null;
}

/** Agenda dividida em o que vem e o que já foi. */
export async function agenda(equipe: boolean) {
  const todos = await listar("evento", equipe);
  const hoje = hojeEmSaoPaulo();
  return {
    proximos: todos.filter((e) => (e.dados.data ?? "") >= hoje),
    passados: todos.filter((e) => (e.dados.data ?? "") < hoje).reverse(),
  };
}

export async function lixeira() {
  return bd.item.findMany({
    where: { apagadoEm: { not: null } },
    orderBy: { apagadoEm: "desc" },
    take: 50,
  });
}

export async function historico() {
  return bd.alteracao.findMany({ orderBy: { quando: "desc" }, take: 40 });
}
