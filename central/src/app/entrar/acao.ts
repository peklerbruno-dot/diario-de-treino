"use server";

import { redirect } from "next/navigation";
import { entrar } from "@/lib/auth";

export async function entrarComCodigo(_: { motivo: string }, dados: FormData): Promise<{ motivo: string }> {
  const r = await entrar(String(dados.get("codigo") ?? ""));
  if (!r.ok) return { motivo: r.motivo ?? "Não deu certo." };
  redirect("/");
}
