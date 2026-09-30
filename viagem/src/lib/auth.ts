import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { bd } from "./bd";

/**
 * A porta — uma conta por pessoa, como no sistema do CEJ deste repositório.
 *
 * A sessão é um cookie assinado com HMAC (`pessoaId.expira.assinatura`); o
 * servidor não guarda sessão nenhuma. Trocar `AUTH_SECRET` derruba todas as
 * sessões de uma vez.
 *
 * Quem pode criar conta: quem tem o convite de uma viagem (o link que se manda
 * no grupo do WhatsApp) ou quem sabe o `CODIGO_DE_FUNDACAO` — para que um
 * estranho que ache o endereço não saia criando conta.
 */

const COOKIE = "viagem_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 24 * 90; // 90 dias: ninguém quer digitar senha no meio da viagem

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto demais.");
    return "segredo-de-desenvolvimento-nao-use-em-producao";
  }
  return s;
}

const assinar = (carga: string) => createHmac("sha256", segredo()).update(carga).digest("base64url");

export function iguais(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type PessoaNaSessao = { id: string; nome: string; email: string; chaveDoAtalho: string };

export async function abrirSessao(pessoaId: string): Promise<void> {
  const expira = Date.now() + DURACAO_MS;
  const carga = `${pessoaId}.${expira}`;
  const jar = await cookies();
  jar.set(COOKIE, `${carga}.${assinar(carga)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
}

export async function fecharSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

async function idDaSessao(): Promise<string | null> {
  const bruto = (await cookies()).get(COOKIE)?.value;
  if (!bruto) return null;
  const pedacos = bruto.split(".");
  if (pedacos.length !== 3) return null;
  const [pessoaId, expira, assinatura] = pedacos;
  if (!iguais(assinar(`${pessoaId}.${expira}`), assinatura)) return null;
  if (!(Number(expira) > Date.now())) return null;
  return pessoaId;
}

export const pessoaAtual = cache(async (): Promise<PessoaNaSessao | null> => {
  const id = await idDaSessao();
  if (!id) return null;
  return bd.pessoa.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, chaveDoAtalho: true },
  });
});

export async function exigirPessoa(): Promise<PessoaNaSessao> {
  const pessoa = await pessoaAtual();
  if (!pessoa) redirect("/entrar");
  return pessoa;
}

/**
 * A pessoa, a viagem e quem ela é na viagem. Quem não é da viagem recebe
 * "não encontrado" — nem fica sabendo que ela existe.
 */
export const exigirMembro = cache(async (viagemId: string) => {
  const pessoa = await exigirPessoa();
  const membro = await bd.membro.findFirst({
    where: { viagemId, pessoaId: pessoa.id, saiuEm: null },
    include: { viagem: true },
  });
  if (!membro) notFound();
  const { viagem, ...eu } = membro;
  return { pessoa, eu, viagem };
});

export async function exigirOrganizacao(viagemId: string) {
  const r = await exigirMembro(viagemId);
  if (!r.eu.organiza) redirect(`/v/${viagemId}/grupo`);
  return r;
}

export const codigoDeFundacaoConfigurado = () => (process.env.CODIGO_DE_FUNDACAO ?? "").trim().length >= 6;

export function codigoDeFundacaoConfere(codigo: string): boolean {
  const esperado = (process.env.CODIGO_DE_FUNDACAO ?? "").trim();
  if (esperado.length < 6) return false;
  return iguais(esperado.toLowerCase(), codigo.trim().toLowerCase());
}
