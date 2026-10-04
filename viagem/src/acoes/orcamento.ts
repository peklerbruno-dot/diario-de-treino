"use server";

import { revalidatePath } from "next/cache";
import { bd } from "@/lib/bd";
import { exigirMembro } from "@/lib/auth";
import { lerValor } from "@/lib/dinheiro";
import { CATEGORIAS_DE_DESPESA } from "@/lib/contas";
import type { ComValores } from "@/lib/formulario";

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

/** Qualquer um do grupo ajusta o orçamento: é um combinado, não uma regra de quem organiza. */
export async function salvarOrcamento(_: ComValores, dados: FormData): Promise<ComValores> {
  const viagemId = texto(dados, "viagemId");
  await exigirMembro(viagemId);
  const valor = (campo: string) => {
    const v = lerValor(texto(dados, campo));
    return v && v > 0 ? v : undefined;
  };
  const categorias: Record<string, number> = {};
  for (const c of CATEGORIAS_DE_DESPESA) {
    const v = valor(`cat_${c.valor}`);
    if (v) categorias[c.valor] = v;
  }
  await bd.viagem.update({
    where: { id: viagemId },
    data: { orcamento: { total: valor("total"), porPessoa: valor("porPessoa"), categorias } },
  });
  revalidatePath(`/v/${viagemId}`, "layout");
  return { valores: { ok: "1" } };
}
