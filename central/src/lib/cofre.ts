import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * O refresh token do Google abre a caixa de e-mail inteira. Ele fica no banco
 * cifrado (AES-256-GCM) com uma chave derivada do AUTH_SECRET: quem lesse só o
 * banco não leria e-mail nenhum.
 */

function chave(): Buffer {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto demais.");
    return createHash("sha256").update("segredo-de-desenvolvimento-nao-use-em-producao").digest();
  }
  return createHash("sha256").update(`cofre:${s}`).digest();
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const corpo = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), corpo].map((b) => b.toString("base64url")).join(".");
}

export function decifrar(guardado: string): string {
  const [iv, tag, corpo] = guardado.split(".").map((p) => Buffer.from(p, "base64url"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(corpo), d.final()]).toString("utf8");
}
