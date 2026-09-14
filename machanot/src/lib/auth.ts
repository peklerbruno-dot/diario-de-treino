import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Entrada na plataforma: um código só, combinado entre a coordenação.
 *
 * Não há contas, nem e-mail, nem senha por pessoa. Quem sabe o código entra;
 * quem não sabe, não. É o mínimo de porta que este sistema precisa ter: sem
 * nenhuma, qualquer um que descobrisse o endereço poderia apagar as machanot.
 *
 * O código fica em CODIGO_DE_ACESSO, cadastrado na Vercel. Trocar é trocar essa
 * variável — nenhuma alteração de código.
 */

const COOKIE = "machanot_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 180; // 180 dias: entra uma vez por temporada

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

/** Confere o código e abre a sessão. */
export async function entrar(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  if (!codigoConfigurado()) {
    return {
      ok: false,
      motivo:
        "Esta instalação está sem código de acesso configurado. Cadastre CODIGO_DE_ACESSO e publique de novo.",
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

/** Para páginas e ações: ou tem sessão, ou vai para a tela de entrada. */
export async function exigirSessao(): Promise<void> {
  if (!(await temSessao())) redirect("/login");
}

/**
 * Quem assina as alterações no registro. Com um código compartilhado não há
 * como saber qual pessoa era — e inventar um nome seria pior do que admitir.
 */
export const AUTOR = "coordenação";
