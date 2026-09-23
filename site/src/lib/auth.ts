import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * A porta da equipe: o seu nome e um código combinado entre todos.
 *
 * Não há conta, cadastro nem senha por pessoa — é o mesmo caminho da
 * plataforma de machanot, e pela mesma razão: quem edita o site muda todo ano,
 * e ninguém deveria precisar pedir acesso a alguém para escrever uma notícia.
 * O nome não é conferido; serve para o histórico dizer quem mudou o quê.
 *
 * O código fica em CODIGO_DE_EDICAO, na Vercel. Trocar é trocar a variável.
 */

const COOKIE = "chazit_equipe";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 120; // quatro meses

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto demais.");
    return "segredo-de-desenvolvimento-nao-use-em-producao";
  }
  return s;
}

const assinar = (carga: string) => createHmac("sha256", segredo()).update(carga).digest("base64url");

function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function codigoConfigurado(): boolean {
  return (process.env.CODIGO_DE_EDICAO ?? "").trim().length >= 4;
}

export async function entrar(nome: string, codigo: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  if (!codigoConfigurado()) {
    return { ok: false, motivo: "O site ainda não tem código de edição. Cadastre CODIGO_DE_EDICAO na Vercel e publique de novo." };
  }
  const limpo = nome.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!limpo) return { ok: false, motivo: "Escreva o seu nome." };
  if (!iguais((process.env.CODIGO_DE_EDICAO ?? "").trim(), codigo.trim())) {
    // Um respiro antes de responder: tentar códigos no chute fica lento.
    await new Promise((r) => setTimeout(r, 800));
    return { ok: false, motivo: "Código incorreto. Confira com a coordenação." };
  }

  const expira = Date.now() + DURACAO_MS;
  const carga = `${expira}.${Buffer.from(limpo).toString("base64url")}`;
  const jar = await cookies();
  jar.set(COOKIE, `${carga}.${assinar(carga)}`, {
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

/** Quem está editando, ou null para o visitante. Só o cookie assinado; sem banco. */
export async function sessao(): Promise<{ nome: string } | null> {
  const bruto = (await cookies()).get(COOKIE)?.value;
  if (!bruto) return null;
  const corte = bruto.lastIndexOf(".");
  if (corte < 1) return null;
  const carga = bruto.slice(0, corte);
  if (!iguais(assinar(carga), bruto.slice(corte + 1))) return null;
  const [expira, nome64] = carga.split(".");
  if (!expira || !nome64 || Number(expira) < Date.now()) return null;
  return { nome: Buffer.from(nome64, "base64url").toString("utf8") };
}

/** Para as ações: sem sessão, a escrita não acontece. */
export async function exigirSessao(): Promise<{ nome: string }> {
  const s = await sessao();
  if (!s) throw new Error("Sua sessão expirou. Entre de novo pela Área da equipe.");
  return s;
}
