"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { ehData, hoje } from "@/lib/datas";
import { formatar, lerValor } from "@/lib/dinheiro";
import { gravarDespesa } from "@/lib/despesas";
import { avisarViagem } from "@/lib/avisos";
import { ErroDeLeitura, lerRecibo } from "@/lib/leitor";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

/** Salvar uma despesa pelo formulário. A regra mora em `src/lib/despesas.ts`. */
export async function salvarDespesa(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { eu, viagem } = await exigirMembro(viagemId);
  const r = await gravarDespesa(
    { viagemId, euId: eu.id, moedaBase: viagem.moedaBase, cambios: viagem.cambios },
    (campo) => texto(dados, campo),
  );
  if ("erro" in r) return { erro: r.erro, valores: valoresDigitados(dados) };
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function apagarDespesa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.despesa.updateMany({ where: { id: texto(dados, "despesaId"), viagemId }, data: { apagadoEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function registrarPagamento(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { eu, viagem } = await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const deId = texto(dados, "deId");
  const paraId = texto(dados, "paraId");
  const valor = lerValor(texto(dados, "valor"));
  if (deId === paraId) return recusar("Quem paga e quem recebe precisam ser pessoas diferentes.");
  const membros = await bd.membro.count({ where: { viagemId, id: { in: [deId, paraId] } } });
  if (membros !== 2) return recusar("Escolha quem pagou e quem recebeu.");
  if (valor == null || valor <= 0) return recusar("Escreva o valor.");

  await bd.pagamento.create({
    data: {
      id: novoId(),
      viagemId,
      deId,
      paraId,
      valor,
      data: ehData(texto(dados, "data")) ? texto(dados, "data") : hoje(),
      notas: texto(dados, "notas").slice(0, 300),
    },
  });
  const nomes = await bd.membro.findMany({ where: { id: { in: [deId, paraId] } }, select: { id: true, nome: true } });
  const nome = (id: string) => nomes.find((m) => m.id === id)?.nome.split(" ")[0] ?? "Alguém";
  await avisarViagem(
    viagemId,
    { titulo: "🤝 Acerto registrado", corpo: `${nome(deId)} pagou ${formatar(valor, viagem.moedaBase)} para ${nome(paraId)}.`, url: `/v/${viagemId}/contas` },
    { para: [deId, paraId], exceto: eu.id },
  );
  revalidatePath(`/v/${viagemId}`, "layout");
  redirect(`/v/${viagemId}/contas`);
}

export async function apagarPagamento(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.pagamento.updateMany({ where: { id: texto(dados, "pagamentoId"), viagemId }, data: { apagadoEm: new Date() } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export type RespostaDoRecibo = { erro?: string; recibo?: import("@/lib/leitor").Recibo & { cambio?: number } };

/** A foto do recibo, lida pelo Gemini, para preencher a despesa nova. */
export async function lerFotoDoRecibo(viagemId: string, imagem: { tipo: string; base64: string }): Promise<RespostaDoRecibo> {
  const { viagem } = await exigirMembro(viagemId);
  if (!imagem?.base64 || !String(imagem.tipo).startsWith("image/")) return { erro: "Escolha uma foto." };
  try {
    const recibo = await lerRecibo({ inlineData: { mimeType: imagem.tipo, data: imagem.base64 } }, hoje());
    const cambios = (viagem.cambios as Record<string, number>) ?? {};
    return { recibo: { ...recibo, cambio: recibo.moeda === viagem.moedaBase ? 1 : cambios[recibo.moeda] } };
  } catch (e) {
    return { erro: e instanceof ErroDeLeitura ? e.message : "Não consegui ler a foto." };
  }
}
