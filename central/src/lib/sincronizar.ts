import "server-only";
import type { Conta } from "@prisma/client";
import { bd } from "./bd";
import { mensagensEmTexto, mensagensReais, resumirThread } from "./conversas";
import { ContaDesconectada, lerThread, listarThreads, type ThreadGmail } from "./google";
import { CotaEsgotada, triar, type ConversaParaTriar } from "./ia";

/**
 * A rodada: para cada conta, busca o que mudou no Gmail, guarda o resumo de
 * cada conversa e manda para a triagem só as que têm mensagem nova — uma
 * conversa parada não é classificada duas vezes.
 */

const DIAS_DA_CAIXA = 14;
const DIAS_DOS_ENVIADOS = 21;
const MAX_CAIXA = 50;
const MAX_ENVIADOS = 30;
const POR_LOTE = 8;
/**
 * Quantas conversas a triagem lê por rodada. A primeira rodada de três contas
 * passa de duzentas, e a Vercel corta a rota em cinco minutos: aqui vão as mais
 * recentes, e o resto fica para a próxima (que tria só o que faltou).
 */
const MAX_TRIAGEM = 64;

/** Roda `fazer` sobre a lista com no máximo `n` ao mesmo tempo. */
async function emParalelo<T, R>(lista: T[], n: number, fazer: (x: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = new Array(lista.length);
  let proximo = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, lista.length) }, async () => {
      while (proximo < lista.length) {
        const i = proximo++;
        saida[i] = await fazer(lista[i]);
      }
    }),
  );
  return saida;
}

export interface ResultadoDaRodada {
  contas: number;
  conversas: number;
  triadas: number;
  /** Conversas que ficaram para a próxima rodada. */
  naFila: number;
  erros: string[];
}

async function sincronizarConta(conta: Conta): Promise<{ conversas: number; paraTriar: ConversaParaTriar[] }> {
  const [daCaixa, enviados] = await Promise.all([
    listarThreads(conta, `in:inbox newer_than:${DIAS_DA_CAIXA}d`, MAX_CAIXA),
    listarThreads(conta, `in:sent newer_than:${DIAS_DOS_ENVIADOS}d`, MAX_ENVIADOS),
  ]);
  const naCaixa = new Set(daCaixa);
  const ids = [...new Set([...daCaixa, ...enviados])];

  // Primeiro o leve (só cabeçalhos) para saber o que mudou…
  const leves = await emParalelo(ids, 8, (id) => lerThread(conta, id, "metadata"));
  const existentes = new Map(
    (await bd.conversa.findMany({ where: { contaId: conta.id, threadId: { in: ids } } })).map((c) => [c.threadId, c]),
  );

  const mudaram: ThreadGmail[] = [];
  let conversas = 0;
  for (const t of leves) {
    const r = resumirThread(t.messages ?? [], conta.email);
    if (!r) continue;
    // Dos enviados, só interessa o que espera resposta dos outros: a última
    // palavra é sua. O resto ou está na caixa, ou já foi arquivado por você.
    if (!naCaixa.has(t.id) && !r.ultimaDeMim) continue;
    conversas++;
    const antes = existentes.get(t.id);
    const nova = !antes || antes.ultimaMensagemId !== r.ultimaMensagemId;
    await bd.conversa.upsert({
      where: { contaId_threadId: { contaId: conta.id, threadId: t.id } },
      create: { contaId: conta.id, threadId: t.id, ...r, naCaixa: naCaixa.has(t.id) },
      update: { ...r, naCaixa: naCaixa.has(t.id), ...(nova ? { resolvida: false } : {}) },
    });
    if (nova || antes?.classificadaMsgId !== r.ultimaMensagemId) mudaram.push(t);
  }

  // O que você arquivou no Gmail sai da caixa aqui também.
  await bd.conversa.updateMany({
    where: { contaId: conta.id, naCaixa: true, threadId: { notIn: daCaixa } },
    data: { naCaixa: false },
  });

  // …e só então o pesado (corpo inteiro) do que precisa de triagem.
  const completas = await emParalelo(mudaram, 6, (t) => lerThread(conta, t.id, "full"));
  const paraTriar = completas.map((t): ConversaParaTriar => {
    const ms = mensagensReais(t.messages);
    const r = resumirThread(ms, conta.email)!;
    return {
      ref: `${conta.id}:${t.id}`,
      conta: conta.rotulo,
      meuEmail: conta.email,
      assunto: r.assunto,
      rotulosDoGmail: [...new Set(ms.flatMap((m) => m.labelIds ?? []))].filter(
        (l) => l === "IMPORTANT" || l.startsWith("CATEGORY_"),
      ),
      ultimaDeMim: r.ultimaDeMim,
      quando: r.ultimaData.getTime(),
      mensagens: mensagensEmTexto(ms, 4),
    };
  });

  await bd.conta.update({ where: { id: conta.id }, data: { ultimaSincronia: new Date() } });
  return { conversas, paraTriar };
}

async function aplicarTriagem(paraTriar: ConversaParaTriar[]): Promise<{ triadas: number; erros: string[] }> {
  const [regras, correcoes] = await Promise.all([
    bd.instrucao.findMany({ orderBy: { criadoEm: "asc" } }),
    bd.correcao.findMany({ orderBy: { criadoEm: "desc" }, take: 40 }),
  ]);
  const lotes: ConversaParaTriar[][] = [];
  for (let i = 0; i < paraTriar.length; i += POR_LOTE) lotes.push(paraTriar.slice(i, i + POR_LOTE));

  const erros: string[] = [];
  let triadas = 0;
  // Dois de cada vez: o plano gratuito do Gemini limita os pedidos por minuto.
  await emParalelo(lotes, 2, async (lote) => {
    try {
      const resultado = await triar(
        lote,
        regras.map((r) => r.texto),
        correcoes.map((c) => ({ de: c.remetenteEmail, assunto: c.assunto, para: c.para })),
      );
      for (const t of resultado) {
        const original = lote.find((c) => c.ref === t.ref);
        if (!original) continue;
        const [contaId, threadId] = t.ref.split(":");
        const atual = await bd.conversa.findUnique({ where: { contaId_threadId: { contaId, threadId } } });
        if (!atual) continue;
        await bd.conversa.update({
          where: { id: atual.id },
          data: {
            // Uma categoria que você corrigiu à mão fica; o resto se atualiza.
            ...(atual.corrigida ? {} : { categoria: t.categoria }),
            prioridade: t.prioridade,
            resumo: t.resumo,
            proximaAcao: t.proximaAcao,
            prazo: t.prazo ? new Date(`${t.prazo}T00:00:00Z`) : null,
            classificadaMsgId: atual.ultimaMensagemId,
          },
        });
        triadas++;
      }
    } catch (e) {
      console.error("[triagem]", e);
      const msg =
        e instanceof CotaEsgotada ? e.message : `Triagem de ${lote.length} conversas falhou: ${(e as Error).message}`;
      // A cota esgotada derruba todos os lotes ao mesmo tempo: um aviso basta.
      if (!erros.includes(msg)) erros.push(msg);
    }
  });
  return { triadas, erros };
}

export async function sincronizarTudo(): Promise<ResultadoDaRodada> {
  const contas = await bd.conta.findMany();
  const erros: string[] = [];
  let conversas = 0;
  const paraTriar: ConversaParaTriar[] = [];

  await Promise.all(
    contas.map(async (conta) => {
      try {
        const r = await sincronizarConta(conta);
        conversas += r.conversas;
        paraTriar.push(...r.paraTriar);
      } catch (e) {
        console.error(`[sincronizar ${conta.email}]`, e);
        erros.push(e instanceof ContaDesconectada ? e.message : `${conta.rotulo}: ${(e as Error).message}`);
      }
    }),
  );

  paraTriar.sort((a, b) => b.quando - a.quando);
  const t = await aplicarTriagem(paraTriar.slice(0, MAX_TRIAGEM));
  return {
    contas: contas.length,
    conversas,
    triadas: t.triadas,
    naFila: Math.max(0, paraTriar.length - MAX_TRIAGEM),
    erros: [...erros, ...t.erros],
  };
}
