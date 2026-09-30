"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { valoresDigitados, type ComValores } from "@/lib/formulario";
import { diasEntre, ehHora } from "@/lib/datas";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

export async function salvarItem(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  const { viagem } = await exigirMembro(viagemId);
  const recusar = (erro: string) => ({ erro, valores: valoresDigitados(dados) });

  const dia = texto(dados, "dia");
  const hora = texto(dados, "hora");
  const lugarId = texto(dados, "lugarId");
  let titulo = texto(dados, "titulo");

  if (!diasEntre(viagem.inicio, viagem.fim).includes(dia)) return recusar("Escolha um dia da viagem.");
  if (hora && !ehHora(hora)) return recusar("Hora inválida.");

  let lugar: { id: string; nome: string } | null = null;
  if (lugarId) {
    lugar = await bd.lugar.findFirst({ where: { id: lugarId, viagemId, apagadoEm: null }, select: { id: true, nome: true } });
    if (!lugar) return recusar("Esse lugar não existe mais.");
  }
  titulo ||= lugar?.nome ?? "";
  if (!titulo) return recusar("Escreva o que é, ou escolha um lugar.");

  const itemId = texto(dados, "itemId");
  const campos = { dia, hora, titulo: titulo.slice(0, 140), notas: texto(dados, "notas").slice(0, 1000), lugarId: lugar?.id ?? null };
  if (itemId) {
    const r = await bd.itemRoteiro.updateMany({ where: { id: itemId, viagemId }, data: campos });
    if (r.count === 0) return recusar("Esse item não existe mais.");
  } else {
    const ultimo = await bd.itemRoteiro.aggregate({ where: { viagemId, dia }, _max: { ordem: true } });
    await bd.itemRoteiro.create({ data: { id: novoId(), viagemId, ...campos, ordem: (ultimo._max.ordem ?? 0) + 1 } });
  }
  revalidatePath(`/v/${viagemId}`, "layout");
  return { valores: { ok: dia } };
}

export async function apagarItem(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.itemRoteiro.deleteMany({ where: { id: texto(dados, "itemId"), viagemId } });
  revalidatePath(`/v/${viagemId}`, "layout");
}

/** Sobe ou desce um item dentro do dia, trocando de lugar com o vizinho. */
export async function moverItem(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const item = await bd.itemRoteiro.findFirst({ where: { id: texto(dados, "itemId"), viagemId } });
  if (!item) return;
  const doDia = await bd.itemRoteiro.findMany({
    where: { viagemId, dia: item.dia },
    orderBy: [{ ordem: "asc" }, { criadoEm: "asc" }],
  });
  const i = doDia.findIndex((x) => x.id === item.id);
  const j = texto(dados, "direcao") === "cima" ? i - 1 : i + 1;
  if (j < 0 || j >= doDia.length) return;
  [doDia[i], doDia[j]] = [doDia[j], doDia[i]];
  await bd.$transaction(doDia.map((x, k) => bd.itemRoteiro.update({ where: { id: x.id }, data: { ordem: k + 1 } })));
  revalidatePath(`/v/${viagemId}`, "layout");
}
