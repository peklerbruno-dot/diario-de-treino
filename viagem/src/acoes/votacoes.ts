"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { avisarViagem } from "@/lib/avisos";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

/**
 * Abrir uma votação. As opções vêm de duas fontes que se somam: lugares da
 * lista marcados (`lugar` repetido) e linhas de texto livre (`opcoes`).
 */
export async function criarEnquete(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const pergunta = texto(dados, "pergunta").slice(0, 200);
  if (!pergunta) return recusar("Escreva a pergunta.");

  const lugarIds = dados.getAll("lugar").map(String);
  const lugares = lugarIds.length
    ? await bd.lugar.findMany({ where: { id: { in: lugarIds }, viagemId, apagadoEm: null }, select: { id: true, nome: true } })
    : [];
  const livres = texto(dados, "opcoes")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const opcoes = [
    ...lugares.map((l) => ({ texto: l.nome, lugarId: l.id as string | null })),
    ...livres.map((t) => ({ texto: t.slice(0, 120), lugarId: null })),
  ].slice(0, 12);
  if (opcoes.length < 2) return recusar("Pelo menos duas opções.");

  const id = novoId();
  await bd.enquete.create({
    data: {
      id,
      viagemId,
      pergunta,
      criadaPorId: eu.id,
      opcoes: { create: opcoes.map((o, i) => ({ id: novoId(), texto: o.texto, lugarId: o.lugarId, ordem: i })) },
    },
  });
  await avisarViagem(
    viagemId,
    { titulo: `🗳️ ${pergunta}`, corpo: `${eu.nome.split(" ")[0]} abriu uma votação: ${opcoes.map((o) => o.texto).join(", ")}.`, url: `/v/${viagemId}/votacoes#${id}` },
    { exceto: eu.id },
  );
  revalidatePath(`/v/${viagemId}`, "layout");
  return { valores: { ok: id } };
}

/** Votar (ou trocar o voto). Tocar na opção já escolhida tira o voto. */
export async function votarEmEnquete(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const opcao = await bd.opcaoEnquete.findFirst({
    where: { id: texto(dados, "opcaoId"), enquete: { viagemId, encerrada: false } },
    select: { id: true, enqueteId: true },
  });
  if (!opcao) return;
  const chave = { enqueteId_membroId: { enqueteId: opcao.enqueteId, membroId: eu.id } };
  const atual = await bd.votoEnquete.findUnique({ where: chave });
  if (atual?.opcaoId === opcao.id) await bd.votoEnquete.delete({ where: chave });
  else
    await bd.votoEnquete.upsert({
      where: chave,
      create: { enqueteId: opcao.enqueteId, membroId: eu.id, opcaoId: opcao.id },
      update: { opcaoId: opcao.id },
    });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function encerrarEnquete(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const reabrir = texto(dados, "reabrir") === "1";
  await bd.enquete.updateMany({ where: { id: texto(dados, "enqueteId"), viagemId }, data: { encerrada: !reabrir } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function apagarEnquete(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.enquete.deleteMany({ where: { id: texto(dados, "enqueteId"), viagemId } });
  revalidatePath(`/v/${viagemId}`, "layout");
}
