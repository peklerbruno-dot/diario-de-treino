"use server";

import { redirect } from "next/navigation";
import { entrar } from "@/lib/auth";

export type EstadoEntrada = { erro?: string; nome?: string };

export async function entrarNoSite(_: EstadoEntrada, form: FormData): Promise<EstadoEntrada> {
  const nome = String(form.get("nome") ?? "");
  const r = await entrar(nome, String(form.get("codigo") ?? ""));
  if (!r.ok) return { erro: r.motivo, nome };
  redirect("/");
}
