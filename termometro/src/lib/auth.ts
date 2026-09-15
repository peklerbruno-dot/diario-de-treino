import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * A porta: um código, e nada mais.
 *
 * Não há conta, e-mail nem senha por pessoa — este app é de uma pessoa só. Quem
 * sabe o código entra; o navegador lembra por seis meses, então na prática você
 * digita isso uma vez por aparelho.
 *
 * O código mora em CODIGO_DE_ACESSO, cadastrado na Vercel. Trocar o código é
 * trocar essa variável e publicar de novo: nenhuma linha de código muda.
 *
 * É pouca porta, e de propósito. O que ela protege é o seu dinheiro à mostra
 * para quem esbarrasse no endereço.
 */

const COOKIE = "termometro_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 180; // 180 dias

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET ausente ou curto demais.");
    }
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
  return (process.env.CODIGO_DE_ACESSO ?? "").trim().length >= 4;
}

/**
 * O código confere?
 *
 * Usado pela porta de trás, a que o atalho do iPhone bate: lá não há navegador
 * nem cookie, só o código viajando num cabeçalho. A comparação é a mesma da
 * entrada pela tela — em tempo constante, para o relógio não contar quantas
 * letras estavam certas.
 */
export function codigoConfere(codigo: string | null | undefined): boolean {
  if (!codigoConfigurado() || !codigo) return false;
  return iguais((process.env.CODIGO_DE_ACESSO ?? "").trim(), codigo.trim());
}

export async function entrar(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!codigoConfigurado()) {
    return {
      ok: false,
      motivo:
        "Esta instalação está sem código de acesso configurado. " +
        "Cadastre CODIGO_DE_ACESSO na Vercel e publique de novo.",
    };
  }
  if (!iguais((process.env.CODIGO_DE_ACESSO ?? "").trim(), codigo.trim())) {
    return { ok: false, motivo: "Código incorreto." };
  }

  const expira = Date.now() + DURACAO_SESSAO_MS;
  const jar = await cookies();
  jar.set(COOKIE, `${expira}.${assinar(String(expira))}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
  return { ok: true };
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Tem sessão válida? Não depende do banco: é só o cookie assinado. */
export async function temSessao(): Promise<boolean> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE)?.value;
  if (!bruto) return false;

  const corte = bruto.lastIndexOf(".");
  if (corte < 1) return false;
  const expira = bruto.slice(0, corte);
  const assinatura = bruto.slice(corte + 1);

  if (!iguais(assinar(expira), assinatura)) return false;
  return Number(expira) > Date.now();
}

export async function exigirSessao(): Promise<void> {
  if (!(await temSessao())) redirect("/entrar");
}

export const NOME_DO_COOKIE = COOKIE;
