"use server";

import { revalidatePath } from "next/cache";
import { bd } from "./bd";
import { exigirSessao } from "./auth";
import { BLOCOS, COLECOES, LIMITE_ARQUIVO, ehChaveBloco, ehTipoItem, type Dados } from "./esquema";
import { limparDados } from "./validar";

/**
 * Toda escrita do site passa por aqui. Cada ação confere a sessão, valida
 * pelo esquema, grava, anota no histórico e manda o site se refazer.
 *
 * As ações devolvem { erro } em vez de lançar: a mensagem precisa chegar
 * inteira a quem está editando, e o Next esconde o texto de erros lançados em
 * produção.
 */

export type Resposta = { ok: true; id?: string } | { ok: false; erro: string };

async function executar(fn: (nome: string) => Promise<Resposta>): Promise<Resposta> {
  try {
    const { nome } = await exigirSessao();
    const r = await fn(nome);
    if (r.ok) revalidatePath("/", "layout");
    return r;
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error && e.message.startsWith("Sua sessão") ? e.message : "Não deu para salvar. Tente de novo em instantes.";
    return { ok: false, erro: msg };
  }
}

const anotar = (quem: string, oQue: string) => bd.alteracao.create({ data: { quem, oQue } });

function rotuloItem(tipo: keyof typeof COLECOES, dados: Dados): string {
  const nome = dados.titulo || dados.nome || dados.legenda || "";
  return nome ? `${COLECOES[tipo].singular} "${nome}"` : COLECOES[tipo].singular;
}

export async function salvarBloco(chave: string, entrada: unknown): Promise<Resposta> {
  return executar(async (quem) => {
    if (!ehChaveBloco(chave)) return { ok: false, erro: "Parte do site desconhecida." };
    const r = limparDados(BLOCOS[chave].campos, entrada);
    if (!r.ok) return r;
    await bd.bloco.upsert({
      where: { chave },
      create: { chave, dados: r.dados, atualizadoPor: quem },
      update: { dados: r.dados, atualizadoPor: quem },
    });
    await anotar(quem, `editou "${BLOCOS[chave].titulo}"`);
    return { ok: true };
  });
}

export async function criarItem(tipo: string, entrada: unknown): Promise<Resposta> {
  return executar(async (quem) => {
    if (!ehTipoItem(tipo)) return { ok: false, erro: "Tipo desconhecido." };
    const r = limparDados(COLECOES[tipo].campos, entrada);
    if (!r.ok) return r;
    // Fotos novas entram no começo da galeria; o resto, no fim da lista.
    const agg = await bd.item.aggregate({ where: { tipo }, _min: { ordem: true }, _max: { ordem: true } });
    const ordem = tipo === "foto" ? (agg._min.ordem ?? 0) - 1 : (agg._max.ordem ?? 0) + 1;
    const novo = await bd.item.create({ data: { tipo, ordem, dados: r.dados, atualizadoPor: quem } });
    await anotar(quem, `adicionou ${rotuloItem(tipo, r.dados)}`);
    return { ok: true, id: novo.id };
  });
}

export async function salvarItem(id: string, entrada: unknown): Promise<Resposta> {
  return executar(async (quem) => {
    const atual = await bd.item.findUnique({ where: { id } });
    if (!atual || !ehTipoItem(atual.tipo)) return { ok: false, erro: "Esse item não existe mais." };
    const r = limparDados(COLECOES[atual.tipo].campos, entrada);
    if (!r.ok) return r;
    await bd.item.update({ where: { id }, data: { dados: r.dados, atualizadoPor: quem } });
    await anotar(quem, `editou ${rotuloItem(atual.tipo, r.dados)}`);
    return { ok: true, id };
  });
}

/** Troca de lugar com o vizinho de cima (-1) ou de baixo (+1). */
export async function moverItem(id: string, direcao: -1 | 1): Promise<Resposta> {
  return executar(async () => {
    const atual = await bd.item.findUnique({ where: { id } });
    if (!atual) return { ok: false, erro: "Esse item não existe mais." };
    const vizinho = await bd.item.findFirst({
      where: {
        tipo: atual.tipo,
        apagadoEm: null,
        ordem: direcao < 0 ? { lt: atual.ordem } : { gt: atual.ordem },
      },
      orderBy: { ordem: direcao < 0 ? "desc" : "asc" },
    });
    if (!vizinho) return { ok: true };
    await bd.$transaction([
      bd.item.update({ where: { id: atual.id }, data: { ordem: vizinho.ordem } }),
      bd.item.update({ where: { id: vizinho.id }, data: { ordem: atual.ordem } }),
    ]);
    return { ok: true };
  });
}

export async function alternarOculto(id: string): Promise<Resposta> {
  return executar(async (quem) => {
    const atual = await bd.item.findUnique({ where: { id } });
    if (!atual || !ehTipoItem(atual.tipo)) return { ok: false, erro: "Esse item não existe mais." };
    await bd.item.update({ where: { id }, data: { oculto: !atual.oculto, atualizadoPor: quem } });
    const dados = (atual.dados ?? {}) as Dados;
    await anotar(quem, `${atual.oculto ? "publicou" : "escondeu"} ${rotuloItem(atual.tipo, dados)}`);
    return { ok: true };
  });
}

export async function apagarItem(id: string): Promise<Resposta> {
  return executar(async (quem) => {
    const atual = await bd.item.findUnique({ where: { id } });
    if (!atual || !ehTipoItem(atual.tipo)) return { ok: false, erro: "Esse item não existe mais." };
    await bd.item.update({ where: { id }, data: { apagadoEm: new Date(), atualizadoPor: quem } });
    await anotar(quem, `apagou ${rotuloItem(atual.tipo, (atual.dados ?? {}) as Dados)}`);
    return { ok: true };
  });
}

export async function restaurarItem(id: string): Promise<Resposta> {
  return executar(async (quem) => {
    const atual = await bd.item.findUnique({ where: { id } });
    if (!atual || !ehTipoItem(atual.tipo)) return { ok: false, erro: "Esse item não existe mais." };
    await bd.item.update({ where: { id }, data: { apagadoEm: null, atualizadoPor: quem } });
    await anotar(quem, `trouxe de volta ${rotuloItem(atual.tipo, (atual.dados ?? {}) as Dados)}`);
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------

const TIPOS_ACEITOS = ["image/webp", "image/jpeg", "image/png", "image/gif", "application/pdf"];

export async function enviarArquivo(form: FormData): Promise<Resposta> {
  try {
    const { nome } = await exigirSessao();
    const f = form.get("arquivo");
    if (!(f instanceof File) || f.size === 0) return { ok: false, erro: "Nenhum arquivo chegou." };
    if (!TIPOS_ACEITOS.includes(f.type)) return { ok: false, erro: "Envie uma foto (JPG, PNG, WebP) ou um PDF." };
    if (f.size > LIMITE_ARQUIVO) return { ok: false, erro: "Arquivo grande demais: o máximo é 4 MB." };
    const salvo = await bd.arquivo.create({
      data: {
        nome: f.name.slice(0, 200) || "arquivo",
        tipo: f.type,
        tamanho: f.size,
        conteudo: Buffer.from(await f.arrayBuffer()),
        criadoPor: nome,
      },
      select: { id: true },
    });
    return { ok: true, id: salvo.id };
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error && e.message.startsWith("Sua sessão") ? e.message : "O envio falhou. Tente de novo.";
    return { ok: false, erro: msg };
  }
}
