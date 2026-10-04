"use server";

import { redirect } from "next/navigation";
import { entrar, sair, sessao } from "@/lib/auth";
import {
  aceitarConvite,
  convidar,
  listarPessoas,
  novoConviteDe,
  removerPessoa,
  trocarMeuCodigo,
  type Pessoa,
} from "@/lib/pessoas";

export async function acaoDeEntrar(_anterior: { erro?: string } | null, dados: FormData) {
  const codigo = String(dados.get("codigo") ?? "");
  const resultado = await entrar(codigo);
  if (!resultado.ok) return { erro: resultado.motivo ?? "Não consegui entrar." };
  redirect("/");
}

export async function acaoDeSair() {
  await sair();
  redirect("/entrar");
}

// ------------------------------------------------------------- só o dono

async function exigirDono() {
  const quem = await sessao();
  if (!quem?.ehDono) throw new Error("Só o dono do app pode fazer isso.");
}

export async function acaoListarPessoas(): Promise<Pessoa[]> {
  await exigirDono();
  return listarPessoas();
}

export async function acaoConvidar(nome: string): Promise<{ token: string } | { erro: string }> {
  await exigirDono();
  try {
    return await convidar(nome);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não consegui criar o convite." };
  }
}

export async function acaoNovoConvite(usuarioId: string): Promise<{ token: string } | { erro: string }> {
  await exigirDono();
  try {
    return await novoConviteDe(usuarioId);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não consegui criar o convite." };
  }
}

export async function acaoRemoverPessoa(usuarioId: string): Promise<{ ok: true } | { erro: string }> {
  await exigirDono();
  try {
    await removerPessoa(usuarioId);
    return { ok: true };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não consegui remover." };
  }
}

// ------------------------------------------------------------- quem chega

export async function acaoAceitarConvite(token: string) {
  return aceitarConvite(token);
}

export async function acaoTrocarMeuCodigo(): Promise<{ codigo: string } | { erro: string }> {
  const quem = await sessao();
  if (!quem) return { erro: "Entre de novo para trocar o código." };
  if (quem.ehDono) return { erro: "O seu código é o da Vercel (CODIGO_DE_ACESSO)." };
  try {
    return { codigo: await trocarMeuCodigo(quem.usuarioId) };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não consegui trocar o código." };
  }
}
