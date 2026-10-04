import type { Fixo, Lancamento, Tipo } from "./tipos";

/**
 * Ler de volta o backup que o próprio app baixou.
 *
 * Ajustes sempre prometeu que o backup JSON "volta pelo Importar" — e não
 * existia caminho nenhum: a promessa era mentira, descoberta na pior hora
 * possível, com o dado perdido na mão. Este leitor fecha a promessa.
 *
 * Ele é tolerante de propósito: valida cada linha SOZINHA e devolve as boas
 * junto com a conta das ignoradas. Um backup meio corrompido restaura o que dá
 * — melhor noventa por cento de volta do que uma recusa inteira.
 */
export interface BackupLido {
  lancamentos: Lancamento[];
  fixos: Fixo[];
  ajustes: { chave: string; valor: string }[];
  ignoradas: number;
}

const TIPOS_VALIDOS = new Set(["ENTRADA", "SAIDA", "DIARIO"]);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function lerBackup(texto: string): BackupLido | { erro: string } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { erro: "Este arquivo não é um backup do Finanças do BP." };
  }
  if (typeof bruto !== "object" || bruto === null) {
    return { erro: "Este arquivo não é um backup do Finanças do BP." };
  }

  const b = bruto as Record<string, unknown>;
  let ignoradas = 0;

  const lancamentos: Lancamento[] = [];
  for (const l of Array.isArray(b.lancamentos) ? b.lancamentos : []) {
    if (ehLancamento(l)) lancamentos.push(l);
    else ignoradas++;
  }

  const fixos: Fixo[] = [];
  for (const f of Array.isArray(b.fixos) ? b.fixos : []) {
    if (ehFixo(f)) fixos.push(f);
    else ignoradas++;
  }

  // O backup guarda os ajustes como objeto chave → {valor, atualizadoEm}.
  const ajustes: { chave: string; valor: string }[] = [];
  if (typeof b.ajustes === "object" && b.ajustes !== null && !Array.isArray(b.ajustes)) {
    for (const [chave, a] of Object.entries(b.ajustes as Record<string, unknown>)) {
      const valor = (a as { valor?: unknown })?.valor;
      if (typeof valor === "string" && chave.length > 0 && chave.length <= 64) {
        ajustes.push({ chave, valor });
      } else {
        ignoradas++;
      }
    }
  }

  if (lancamentos.length === 0 && fixos.length === 0 && ajustes.length === 0) {
    return { erro: "Este arquivo não tem nada do Finanças do BP dentro." };
  }
  return { lancamentos, fixos, ajustes, ignoradas };
}

function ehLancamento(v: unknown): v is Lancamento {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Partial<Lancamento>;
  return (
    typeof l.id === "string" &&
    l.id.length > 0 &&
    l.id.length <= 64 &&
    typeof l.data === "string" &&
    DATA.test(l.data) &&
    typeof l.tipo === "string" &&
    TIPOS_VALIDOS.has(l.tipo as Tipo) &&
    typeof l.valorCents === "number" &&
    Number.isFinite(l.valorCents)
  );
}

function ehFixo(v: unknown): v is Fixo {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Partial<Fixo>;
  return (
    typeof f.id === "string" &&
    f.id.length > 0 &&
    f.id.length <= 64 &&
    typeof f.tipo === "string" &&
    TIPOS_VALIDOS.has(f.tipo as Tipo) &&
    typeof f.dia === "number" &&
    Number.isInteger(f.dia) &&
    f.dia >= 0 &&
    f.dia <= 31 &&
    typeof f.valorCents === "number" &&
    Number.isFinite(f.valorCents)
  );
}
