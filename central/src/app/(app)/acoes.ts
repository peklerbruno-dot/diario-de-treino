"use server";

import { revalidatePath } from "next/cache";
import { agendaEmTexto, compromissos } from "@/lib/agenda";
import { exigirSessao } from "@/lib/auth";
import { bd } from "@/lib/bd";
import { IDS_DE_CATEGORIA, categoria as nomeDaCategoria } from "@/lib/categorias";
import { linkDoGmail, mensagensEmTexto, mensagensReais } from "@/lib/conversas";
import { corpoEmTexto, semCitacao, assuntoDeResposta, cabecalho, destinatariosDaResposta, montarMime, separarEndereco } from "@/lib/gmail";
import {
  arquivarThread,
  atualizarRascunhoNoGmail,
  baixarAnexo,
  criarEventoDeDiaInteiro,
  criarRascunhoNoGmail,
  lerThread,
  listarEnviadas,
  salvarNoDrive,
} from "@/lib/google";
import { descreverEstilo, iaConfigurada, rascunhar } from "@/lib/ia";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

const falha = (e: unknown): { ok: false; erro: string } => {
  console.error(e);
  return { ok: false, erro: e instanceof Error ? e.message : "Algo deu errado." };
};

async function conversaComConta(id: string) {
  const c = await bd.conversa.findUnique({ where: { id }, include: { conta: true } });
  if (!c) throw new Error("Conversa não encontrada.");
  return c;
}

// ——— Rascunho ———

export async function gerarRascunho(
  conversaId: string,
  contexto: string,
  versaoAnterior?: string,
): Promise<Resultado<{ texto: string }>> {
  await exigirSessao();
  try {
    if (!iaConfigurada()) throw new Error("Falta GEMINI_API_KEY na Vercel.");
    const c = await conversaComConta(conversaId);
    const [thread, contas, regras] = await Promise.all([
      lerThread(c.conta, c.threadId, "full"),
      bd.conta.findMany(),
      bd.instrucao.findMany({ orderBy: { criadoEm: "asc" } }),
    ]);
    const agora = new Date();
    const agenda = await compromissos(contas, agora, new Date(agora.getTime() + 14 * 86_400_000));
    const texto = await rascunhar({
      meuEmail: c.conta.email,
      conta: c.conta.rotulo,
      assunto: c.assunto,
      mensagens: mensagensEmTexto(thread.messages ?? [], 8, 6000),
      contexto,
      estilo: c.conta.estilo,
      agenda: agendaEmTexto(agenda),
      regras: regras.map((r) => r.texto),
      versaoAnterior,
    });
    return { ok: true, texto };
  } catch (e) {
    return falha(e);
  }
}

/** Grava o rascunho no Gmail, dentro da conversa. Nada é enviado. */
export async function salvarRascunho(
  conversaId: string,
  texto: string,
  contexto: string,
): Promise<Resultado<{ link: string }>> {
  await exigirSessao();
  try {
    const c = await conversaComConta(conversaId);
    const thread = await lerThread(c.conta, c.threadId, "full");
    const ms = mensagensReais(thread.messages);
    const ultima = ms[ms.length - 1];
    const { para, cc } = destinatariosDaResposta(ms, c.conta.email);
    if (!para.length) throw new Error("Não achei para quem responder nesta conversa.");
    const raw = montarMime({
      para,
      cc,
      assunto: assuntoDeResposta(cabecalho(ms[0], "Subject") || c.assunto),
      corpo: texto,
      emRespostaA: cabecalho(ultima, "Message-ID") || undefined,
      referencias: cabecalho(ultima, "References") || undefined,
    });

    // Um rascunho por conversa: salvar de novo atualiza o mesmo, em vez de
    // empilhar versões no Gmail.
    const anterior = await bd.rascunho.findFirst({
      where: { conversaId, gmailDraftId: { not: null } },
      orderBy: { criadoEm: "desc" },
    });
    let draftId: string;
    try {
      if (!anterior?.gmailDraftId) throw new Error("sem anterior");
      await atualizarRascunhoNoGmail(c.conta, anterior.gmailDraftId, c.threadId, raw);
      draftId = anterior.gmailDraftId;
    } catch {
      // O anterior foi enviado ou apagado no Gmail: cria outro.
      draftId = await criarRascunhoNoGmail(c.conta, c.threadId, raw);
    }
    await bd.rascunho.create({ data: { conversaId, contexto, texto, gmailDraftId: draftId } });
    revalidatePath(`/conversa/${conversaId}`);
    return { ok: true, link: linkDoGmail(c.conta.email, c.threadId) };
  } catch (e) {
    return falha(e);
  }
}

// ——— Triagem à mão ———

export async function corrigirCategoria(conversaId: string, nova: string): Promise<void> {
  await exigirSessao();
  if (!(IDS_DE_CATEGORIA as string[]).includes(nova)) return;
  const c = await bd.conversa.findUnique({ where: { id: conversaId } });
  if (!c || c.categoria === nova) return;
  await bd.$transaction([
    bd.conversa.update({ where: { id: conversaId }, data: { categoria: nova, corrigida: true } }),
    bd.correcao.create({
      data: {
        remetenteEmail: c.remetenteEmail,
        assunto: c.assunto,
        de: nomeDaCategoria(c.categoria).nome,
        para: nomeDaCategoria(nova).nome,
      },
    }),
  ]);
  revalidatePath("/", "layout");
}

export async function marcarResolvida(conversaId: string, resolvida: boolean): Promise<void> {
  await exigirSessao();
  await bd.conversa.update({ where: { id: conversaId }, data: { resolvida } });
  revalidatePath("/", "layout");
}

export async function arquivarNoGmail(conversaId: string): Promise<Resultado> {
  await exigirSessao();
  try {
    const c = await conversaComConta(conversaId);
    await arquivarThread(c.conta, c.threadId);
    await bd.conversa.update({ where: { id: conversaId }, data: { naCaixa: false, resolvida: true } });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return falha(e);
  }
}

// ——— Agenda e Drive ———

export async function porPrazoNaAgenda(conversaId: string): Promise<Resultado<{ link: string }>> {
  await exigirSessao();
  try {
    const c = await conversaComConta(conversaId);
    if (!c.prazo) throw new Error("Esta conversa não tem prazo.");
    const evento = await criarEventoDeDiaInteiro(
      c.conta,
      c.prazo.toISOString().slice(0, 10),
      `Prazo: ${c.proximaAcao || c.assunto}`,
      `${c.resumo}\n\nConversa: ${linkDoGmail(c.conta.email, c.threadId)}`,
    );
    return { ok: true, link: evento.htmlLink ?? "" };
  } catch (e) {
    return falha(e);
  }
}

export async function salvarAnexo(
  conversaId: string,
  anexo: { mensagemId: string; anexoId: string; nome: string; tipo: string },
): Promise<Resultado<{ link: string }>> {
  await exigirSessao();
  try {
    const c = await conversaComConta(conversaId);
    const conteudo = await baixarAnexo(c.conta, anexo.mensagemId, anexo.anexoId);
    const subpasta = nomeDaCategoria(c.categoria).nome;
    const link = await salvarNoDrive(c.conta, subpasta, anexo.nome, anexo.tipo, conteudo);
    return { ok: true, link };
  } catch (e) {
    return falha(e);
  }
}

// ——— Ajustes ———

export async function renomearConta(dados: FormData): Promise<void> {
  await exigirSessao();
  const id = String(dados.get("id"));
  const rotulo = String(dados.get("rotulo") ?? "").trim().slice(0, 20);
  if (rotulo) await bd.conta.update({ where: { id }, data: { rotulo } });
  revalidatePath("/", "layout");
}

export async function removerConta(id: string): Promise<void> {
  await exigirSessao();
  await bd.conta.delete({ where: { id } });
  revalidatePath("/", "layout");
}

/** Lê os seus últimos e-mails enviados e descreve como você escreve. */
export async function aprenderEstilo(contaId: string): Promise<Resultado<{ estilo: string }>> {
  await exigirSessao();
  try {
    if (!iaConfigurada()) throw new Error("Falta GEMINI_API_KEY na Vercel.");
    const conta = await bd.conta.findUniqueOrThrow({ where: { id: contaId } });
    const enviadas = await listarEnviadas(conta, 25);
    const amostra = enviadas
      .map((m) => ({
        para: separarEndereco(cabecalho(m, "To").split(",")[0] ?? "").email,
        texto: semCitacao(corpoEmTexto(m)).slice(0, 1500),
      }))
      .filter((e) => e.texto.length > 20);
    if (amostra.length < 3) throw new Error("Poucos e-mails enviados nesta conta para aprender o estilo.");
    const estilo = await descreverEstilo(conta.rotulo, amostra);
    await bd.conta.update({ where: { id: contaId }, data: { estilo } });
    revalidatePath("/ajustes");
    return { ok: true, estilo };
  } catch (e) {
    return falha(e);
  }
}

export async function salvarEstilo(dados: FormData): Promise<void> {
  await exigirSessao();
  await bd.conta.update({
    where: { id: String(dados.get("id")) },
    data: { estilo: String(dados.get("estilo") ?? "").trim() || null },
  });
  revalidatePath("/ajustes");
}

export async function adicionarInstrucao(dados: FormData): Promise<void> {
  await exigirSessao();
  const texto = String(dados.get("texto") ?? "").trim().slice(0, 500);
  if (texto) await bd.instrucao.create({ data: { texto } });
  revalidatePath("/ajustes");
}

export async function removerInstrucao(id: string): Promise<void> {
  await exigirSessao();
  await bd.instrucao.delete({ where: { id } });
  revalidatePath("/ajustes");
}

/** Esquece a triagem de tudo: a próxima rodada classifica de novo com as regras atuais. */
export async function refazerTriagem(): Promise<void> {
  await exigirSessao();
  await bd.conversa.updateMany({ data: { classificadaMsgId: null } });
  revalidatePath("/ajustes");
}
