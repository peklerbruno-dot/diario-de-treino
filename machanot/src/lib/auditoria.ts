import "server-only";
import { prisma } from "@/lib/db";
import type { AlvoAlteracao } from "@prisma/client";

/**
 * §11 — quem mexeu em peso, preço e gasto fica registrado, com o valor de antes
 * e o de depois. É o que responde "por que este número mudou?" seis meses depois.
 */
export async function registrar(entrada: {
  machaneId: string;
  email: string;
  alvo: AlvoAlteracao;
  descricao: string;
  valorAntes?: string | null;
  valorDepois?: string | null;
  justificativa?: string | null;
}): Promise<void> {
  await prisma.registroAlteracao.create({
    data: {
      machaneId: entrada.machaneId,
      email: entrada.email,
      alvo: entrada.alvo,
      descricao: entrada.descricao,
      valorAntes: entrada.valorAntes ?? null,
      valorDepois: entrada.valorDepois ?? null,
      justificativa: entrada.justificativa ?? null,
    },
  });
}

/** Resumo legível de um patch, para o registro. */
export function descreverPatch(patch: Record<string, unknown>): string {
  return Object.entries(patch)
    .map(([k, v]) => `${k}=${v === null ? "vazio" : String(v)}`)
    .join(", ");
}
