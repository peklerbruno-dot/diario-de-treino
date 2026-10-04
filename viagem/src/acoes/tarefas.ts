"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirMembro } from "@/lib/auth";
import { ehData } from "@/lib/datas";
import { avisarViagem } from "@/lib/avisos";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

/** Sugestões para a primeira vez — o que todo grupo indo ao México esquece. */
const SUGESTOES = [
  "Conferir a exigência de visto para entrar no México (e passaporte com 6 meses de validade)",
  "Contratar seguro viagem",
  "Chip ou eSIM com internet no México",
  "Avisar o banco e liberar os cartões para uso no exterior",
  "Levar pesos em espécie para táxi, gorjeta e barraquinha",
  "Adaptador de tomada (no México é o padrão americano, tipo A/B)",
  "Reservar os restaurantes que pedem reserva",
  "Baixar o mapa offline da cidade no Google Maps",
];

async function reabrir(viagemId: string) {
  revalidatePath(`/v/${viagemId}`, "layout");
}

async function membroDaViagem(viagemId: string, id: string) {
  if (!id) return null;
  return bd.membro.findFirst({ where: { id, viagemId }, select: { id: true, nome: true } });
}

export async function criarTarefa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const linhas = texto(dados, "texto")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30);
  if (!linhas.length) return;
  const resp = await membroDaViagem(viagemId, texto(dados, "responsavelId"));
  const prazo = ehData(texto(dados, "prazo")) ? texto(dados, "prazo") : "";
  await bd.tarefa.createMany({
    data: linhas.map((t) => ({ id: novoId(), viagemId, texto: t.slice(0, 200), responsavelId: resp?.id ?? null, prazo })),
  });
  if (resp && resp.id !== eu.id) {
    await avisarViagem(
      viagemId,
      { titulo: "✅ Tarefa para você", corpo: `${eu.nome.split(" ")[0]}: ${linhas.join("; ")}`, url: `/v/${viagemId}/tarefas` },
      { para: [resp.id] },
    );
  }
  await reabrir(viagemId);
}

export async function sugerirTarefas(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const existentes = new Set((await bd.tarefa.findMany({ where: { viagemId }, select: { texto: true } })).map((t) => t.texto));
  const novas = SUGESTOES.filter((t) => !existentes.has(t));
  if (novas.length) await bd.tarefa.createMany({ data: novas.map((t) => ({ id: novoId(), viagemId, texto: t })) });
  await reabrir(viagemId);
}

export async function marcarTarefa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const feita = texto(dados, "feita") === "sim";
  await bd.tarefa.updateMany({ where: { id: texto(dados, "tarefaId"), viagemId }, data: { feita, feitaEm: feita ? new Date() : null } });
  await reabrir(viagemId);
}

/** Pegar para si, passar para alguém ou soltar a tarefa. */
export async function atribuirTarefa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  const { eu } = await exigirMembro(viagemId);
  const tarefa = await bd.tarefa.findFirst({ where: { id: texto(dados, "tarefaId"), viagemId } });
  if (!tarefa) return;
  const resp = await membroDaViagem(viagemId, texto(dados, "responsavelId"));
  await bd.tarefa.update({ where: { id: tarefa.id }, data: { responsavelId: resp?.id ?? null } });
  if (resp && resp.id !== eu.id && resp.id !== tarefa.responsavelId) {
    await avisarViagem(
      viagemId,
      { titulo: "✅ Tarefa para você", corpo: `${eu.nome.split(" ")[0]} te passou: ${tarefa.texto}`, url: `/v/${viagemId}/tarefas` },
      { para: [resp.id] },
    );
  }
  await reabrir(viagemId);
}

export async function apagarTarefa(dados: FormData): Promise<void> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  await bd.tarefa.deleteMany({ where: { id: texto(dados, "tarefaId"), viagemId } });
  await reabrir(viagemId);
}
