"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { diasEntre, ehHora } from "@/lib/datas";
import { ErroDeLeitura, lerReserva, temGemini } from "@/lib/leitor";

const TIPOS = ["voo", "hospedagem", "seguro", "passeio", "transporte", "outro"];
const MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
/** O que cabe num envio para a Vercel (4,5 MB), já contando o base64. */
const TAMANHO_MAXIMO = 3_300_000;

export type ItemSugerido = { dia: string; hora: string; titulo: string; notas: string; dentro: boolean };
export type RespostaDoDocumento = { erro?: string; id?: string; itens?: ItemSugerido[]; aviso?: string };

export async function enviarDocumento(
  viagemId: string,
  entrada: { nome: string; mime: string; base64: string; titulo: string; tipo: string; notas: string; ler: boolean },
): Promise<RespostaDoDocumento> {
  const { eu, viagem } = await exigirMembro(viagemId);
  if (!MIMES.includes(entrada.mime)) return { erro: "Mande PDF ou imagem." };
  const dados = Buffer.from(entrada.base64 ?? "", "base64");
  if (!dados.length) return { erro: "O arquivo veio vazio." };
  if (dados.length > TAMANHO_MAXIMO) return { erro: "Arquivo grande demais (máximo ~3 MB). Mande um print da parte importante." };

  let titulo = entrada.titulo.trim().slice(0, 140);
  let tipo = TIPOS.includes(entrada.tipo) ? entrada.tipo : "outro";
  let notas = entrada.notas.trim().slice(0, 2000);
  let itens: ItemSugerido[] = [];
  let aviso: string | undefined;

  if (entrada.ler && (await temGemini())) {
    try {
      const r = await lerReserva({ inlineData: { mimeType: entrada.mime, data: entrada.base64 } }, viagem.inicio.slice(0, 4));
      titulo ||= r.titulo;
      if (entrada.tipo === "outro" || !entrada.tipo) tipo = TIPOS.includes(r.tipo) ? r.tipo : tipo;
      notas ||= r.resumo;
      const dias = new Set(diasEntre(viagem.inicio, viagem.fim));
      itens = r.itens.map((i) => ({ ...i, dentro: dias.has(i.dia) }));
    } catch (e) {
      aviso = e instanceof ErroDeLeitura ? e.message : "Não consegui ler o documento; ele foi guardado mesmo assim.";
    }
  }

  const id = novoId();
  await bd.documento.create({
    data: {
      id,
      viagemId,
      titulo: titulo || entrada.nome.slice(0, 140) || "Documento",
      tipo,
      notas,
      nomeDoArquivo: entrada.nome.slice(0, 200),
      mime: entrada.mime,
      tamanho: dados.length,
      dados,
      enviadoPorId: eu.id,
    },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
  return { id, itens, aviso };
}

/** Os itens que a leitura achou e a pessoa confirmou vão para o roteiro. */
export async function itensParaORoteiro(viagemId: string, itens: { dia: string; hora: string; titulo: string; notas: string }[]): Promise<{ n: number }> {
  const { viagem } = await exigirMembro(viagemId);
  const dias = new Set(diasEntre(viagem.inicio, viagem.fim));
  const validos = (itens ?? []).filter((i) => dias.has(i.dia) && i.titulo?.trim()).slice(0, 20);
  for (const i of validos) {
    const ultimo = await bd.itemRoteiro.aggregate({ where: { viagemId, dia: i.dia }, _max: { ordem: true } });
    await bd.itemRoteiro.create({
      data: {
        id: novoId(),
        viagemId,
        dia: i.dia,
        hora: ehHora(i.hora) ? i.hora : "",
        titulo: i.titulo.trim().slice(0, 140),
        notas: (i.notas ?? "").slice(0, 1000),
        ordem: (ultimo._max.ordem ?? 0) + 1,
      },
    });
  }
  revalidatePath(`/v/${viagemId}`, "layout");
  return { n: validos.length };
}

export async function editarDocumento(dados: FormData): Promise<void> {
  const viagemId = String(dados.get("viagemId") ?? "");
  await exigirMembro(viagemId);
  const tipo = String(dados.get("tipo") ?? "");
  await bd.documento.updateMany({
    where: { id: String(dados.get("documentoId") ?? ""), viagemId },
    data: {
      titulo: String(dados.get("titulo") ?? "").trim().slice(0, 140) || "Documento",
      tipo: TIPOS.includes(tipo) ? tipo : "outro",
      notas: String(dados.get("notas") ?? "").trim().slice(0, 2000),
    },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
}

export async function apagarDocumento(dados: FormData): Promise<void> {
  const viagemId = String(dados.get("viagemId") ?? "");
  await exigirMembro(viagemId);
  // O arquivo sai de verdade; fica só a linha, marcada como apagada.
  await bd.documento.updateMany({
    where: { id: String(dados.get("documentoId") ?? ""), viagemId },
    data: { apagadoEm: new Date(), dados: null },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
}
