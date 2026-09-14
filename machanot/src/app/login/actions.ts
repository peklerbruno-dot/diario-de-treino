"use server";

import { redirect } from "next/navigation";
import { entrar } from "@/lib/auth";

export interface EstadoLogin {
  erro?: string;
}

/** Para onde ir depois de entrar. Só caminho interno: "//outro.site" não passa. */
function destinoSeguro(bruto: FormDataEntryValue | null): string {
  const destino = typeof bruto === "string" ? bruto : "";
  return destino.startsWith("/") && !destino.startsWith("//") ? destino : "/";
}

export async function entrarNaPlataforma(
  _anterior: EstadoLogin,
  form: FormData,
): Promise<EstadoLogin> {
  const codigo = String(form.get("codigo") ?? "");
  if (codigo.trim() === "") return { erro: "Digite o código." };

  let r: { ok: boolean; motivo?: string };
  try {
    r = await entrar(codigo);
  } catch (e) {
    console.error(e);
    return { erro: "O sistema não está respondendo agora. Tente de novo em instantes." };
  }
  if (!r.ok) return { erro: r.motivo ?? "Não deu para entrar." };

  redirect(destinoSeguro(form.get("de")));
}
