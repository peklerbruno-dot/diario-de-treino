import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { enviarLinkDeEntrada } from "@/lib/email";

const COOKIE = "machanot_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias
const DURACAO_TOKEN_MS = 1000 * 60 * 15; // 15 minutos

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

const hash = (valor: string) => createHash("sha256").update(valor).digest("hex");

function assinar(carga: string): string {
  return createHmac("sha256", segredo()).update(carga).digest("base64url");
}

function conferirAssinatura(carga: string, assinatura: string): boolean {
  const esperada = Buffer.from(assinar(carga));
  const recebida = Buffer.from(assinatura);
  return esperada.length === recebida.length && timingSafeEqual(esperada, recebida);
}

export function emailAutorizado(email: string): boolean {
  const lista = (process.env.EMAILS_AUTORIZADOS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return true; // sem lista = liberado (só faz sentido em dev)
  return lista.includes(email.trim().toLowerCase());
}

/** Cria o token de entrada e dispara o e-mail. Devolve a URL (usada só em dev). */
export async function criarLinkDeEntrada(email: string, origem: string): Promise<string> {
  const normalizado = email.trim().toLowerCase();
  const usuario = await prisma.usuario.upsert({
    where: { email: normalizado },
    update: {},
    create: { email: normalizado },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.tokenAcesso.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hash(token),
      expiraEm: new Date(Date.now() + DURACAO_TOKEN_MS),
    },
  });

  const url = `${origem.replace(/\/$/, "")}/entrar/${token}`;
  await enviarLinkDeEntrada(normalizado, url);
  return url;
}

/** Troca o token pelo cookie de sessão. Uso único. */
export async function consumirToken(token: string): Promise<{ ok: boolean; motivo?: string }> {
  const registro = await prisma.tokenAcesso.findUnique({
    where: { tokenHash: hash(token) },
    include: { usuario: true },
  });
  if (!registro) return { ok: false, motivo: "Link inválido." };
  if (registro.usadoEm) return { ok: false, motivo: "Este link já foi usado. Peça outro." };
  if (registro.expiraEm < new Date()) return { ok: false, motivo: "Link expirado. Peça outro." };
  if (!emailAutorizado(registro.usuario.email)) {
    return { ok: false, motivo: "E-mail não autorizado." };
  }

  await prisma.tokenAcesso.update({
    where: { id: registro.id },
    data: { usadoEm: new Date() },
  });
  await prisma.usuario.update({
    where: { id: registro.usuarioId },
    data: { ultimoAcessoEm: new Date() },
  });

  const expira = Date.now() + DURACAO_SESSAO_MS;
  const carga = `${registro.usuarioId}.${expira}`;
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
  const jar = await cookies();
  jar.delete(COOKIE);
}

export interface Sessao {
  usuarioId: string;
  email: string;
  nome: string | null;
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE)?.value;
  if (!bruto) return null;

  const partes = bruto.split(".");
  if (partes.length !== 3) return null;
  const [usuarioId, expira, assinatura] = partes as [string, string, string];
  if (!conferirAssinatura(`${usuarioId}.${expira}`, assinatura)) return null;
  if (Number(expira) < Date.now()) return null;

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return null;
  if (!emailAutorizado(usuario.email)) return null;
  return { usuarioId: usuario.id, email: usuario.email, nome: usuario.nome };
}

/** Para páginas e ações: ou tem sessão, ou vai para o login. */
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  return sessao;
}
