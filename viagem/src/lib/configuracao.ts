import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { bd } from "./bd";

/**
 * A chave do Gemini pode vir de dois lugares: da variável `GEMINI_API_KEY`
 * (quem configura pela Vercel) ou da tela Grupo, onde quem organiza cola a
 * chave e ela fica no banco — cifrada com AES-GCM sobre o `AUTH_SECRET`, para
 * que um backup do banco sozinho não a entregue.
 */

const CHAVE_GEMINI = "gemini_api_key";

function cifra(): Buffer {
  const segredo = process.env.AUTH_SECRET || "segredo-de-desenvolvimento-nao-use-em-producao";
  return createHash("sha256").update(`configuracao:${segredo}`).digest();
}

function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cifra(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}

function decifrar(guardado: string): string | null {
  try {
    const [iv, tag, dados] = guardado.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", cifra(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
  } catch {
    return null; // AUTH_SECRET trocado: a chave guardada deixa de valer.
  }
}

let emCache: { valor: string | null; ate: number } | null = null;

export async function chaveDoGemini(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (emCache && emCache.ate > Date.now()) return emCache.valor;
  const linha = await bd.configuracao.findUnique({ where: { chave: CHAVE_GEMINI } });
  const valor = linha ? decifrar(linha.valor) : null;
  emCache = { valor, ate: Date.now() + 60_000 };
  return valor;
}

export async function guardarChaveDoGemini(chave: string | null): Promise<void> {
  if (chave) {
    const valor = cifrar(chave);
    await bd.configuracao.upsert({ where: { chave: CHAVE_GEMINI }, create: { chave: CHAVE_GEMINI, valor }, update: { valor } });
  } else {
    await bd.configuracao.deleteMany({ where: { chave: CHAVE_GEMINI } });
  }
  emCache = null;
}

export const chaveVemDaVercel = () => Boolean(process.env.GEMINI_API_KEY);

/** Pergunta ao Google se a chave serve, sem gastar cota de geração. */
export async function chaveFunciona(chave: string): Promise<boolean> {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(chave)}`, {
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}
