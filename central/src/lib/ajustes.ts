import "server-only";
import { bd } from "./bd";

/** Preferências guardadas como chave e valor, com um padrão quando ainda não existem. */
export async function lerAjuste(chave: string, padrao = ""): Promise<string> {
  return (await bd.ajuste.findUnique({ where: { chave } }))?.valor ?? padrao;
}

export async function gravarAjuste(chave: string, valor: string): Promise<void> {
  await bd.ajuste.upsert({ where: { chave }, create: { chave, valor }, update: { valor } });
}
