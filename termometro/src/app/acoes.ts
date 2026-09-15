"use server";

import { redirect } from "next/navigation";
import { entrar, sair } from "@/lib/auth";

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
