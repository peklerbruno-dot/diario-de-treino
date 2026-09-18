import { randomUUID, randomBytes } from "node:crypto";

/** O identificador de uma linha. */
export const novoId = () => randomUUID();

/**
 * Um segredo para viajar em endereço — a chave da agenda, o convite de primeiro
 * acesso. Base 64 de URL, 32 bytes: não se adivinha, e não quebra ao ser colado
 * num WhatsApp.
 */
export const novoSegredo = () => randomBytes(32).toString("base64url");
