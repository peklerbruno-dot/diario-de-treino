import "server-only";
import type { Conta, Conversa, Prisma } from "@prisma/client";
import { bd } from "./bd";
import { mensagensEmTexto } from "./conversas";
import type { MensagemGmail } from "./gmail";
import { montarDossie, type Dossie } from "./ia";

/**
 * O dossiê de uma conversa: o guardado, se nenhuma mensagem chegou depois
 * dele; senão, um novo (e guardado). Assim a cota do Gemini só se gasta
 * quando a história muda.
 */
export async function dossieDe(c: Conversa & { conta: Conta }, mensagens: MensagemGmail[]): Promise<Dossie> {
  if (c.dossie && c.dossieMsgId === c.ultimaMensagemId) return c.dossie as unknown as Dossie;
  const d = await montarDossie({
    conta: c.conta.rotulo,
    meuEmail: c.conta.email,
    assunto: c.assunto,
    mensagens: mensagensEmTexto(mensagens, 10, 1500),
  });
  await bd.conversa.update({
    where: { id: c.id },
    data: { dossie: d as unknown as Prisma.InputJsonValue, dossieMsgId: c.ultimaMensagemId },
  });
  return d;
}
