"use server";

import { bd } from "@/lib/bd";
import { novoId } from "@/lib/ids";
import { exigirPessoa } from "@/lib/auth";
import { avisarPessoas } from "@/lib/avisos";

type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Guarda a inscrição deste aparelho. Chamado pelo botão "Ativar avisos". */
export async function inscreverAparelho(inscricao: Inscricao): Promise<{ ok: boolean }> {
  const pessoa = await exigirPessoa();
  const { endpoint, keys } = inscricao ?? {};
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !keys?.p256dh || !keys?.auth) return { ok: false };
  await bd.inscricaoPush.upsert({
    where: { endpoint },
    create: { id: novoId(), pessoaId: pessoa.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { pessoaId: pessoa.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  await avisarPessoas([pessoa.id], {
    titulo: "Avisos ligados ✓",
    corpo: "Você vai saber quando alguém lançar despesa, mandar lugar ou abrir votação.",
    url: "/",
  });
  return { ok: true };
}

export async function cancelarAparelho(endpoint: string): Promise<void> {
  const pessoa = await exigirPessoa();
  await bd.inscricaoPush.deleteMany({ where: { endpoint, pessoaId: pessoa.id } });
}
