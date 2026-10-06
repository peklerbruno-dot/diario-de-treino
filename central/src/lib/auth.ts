import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * A porta: um código só, o do dono (CODIGO_DE_ACESSO na Vercel). O navegador
 * lembra por seis meses, num cookie assinado com o AUTH_SECRET.
 */

const COOKIE = "central_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 180;

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto demais.");
    return "segredo-de-desenvolvimento-nao-use-em-producao";
  }
  return s;
}

export const assinar = (carga: string) => createHmac("sha256", segredo()).update(carga).digest("base64url");

export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function codigoConfigurado(): boolean {
  return (process.env.CODIGO_DE_ACESSO ?? "").trim().length >= 4;
}

export async function entrar(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!codigoConfigurado()) {
    return { ok: false, motivo: "Falta cadastrar CODIGO_DE_ACESSO na Vercel e publicar de novo." };
  }
  if (!iguais((process.env.CODIGO_DE_ACESSO ?? "").trim(), codigo.trim())) {
    return { ok: false, motivo: "Código incorreto." };
  }
  const expira = Date.now() + DURACAO_MS;
  const carga = `dono.${expira}`;
  (await cookies()).set(COOKIE, `${carga}.${assinar(carga)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
  return { ok: true };
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function temSessao(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const i = valor.lastIndexOf(".");
  const carga = valor.slice(0, i);
  const assinatura = valor.slice(i + 1);
  if (!iguais(assinar(carga), assinatura)) return false;
  const expira = Number(carga.split(".")[1]);
  return Number.isFinite(expira) && expira > Date.now();
}

/** Para as páginas e ações: sem sessão, vai para a entrada. */
export async function exigirSessao(): Promise<void> {
  if (!(await temSessao())) redirect("/entrar");
}
