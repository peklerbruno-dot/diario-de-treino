import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bd } from "./bd";
import { normalizarCodigo } from "./codigos";

/**
 * A porta: cada pessoa, um código.
 *
 * O dono (o BP) entra com o CODIGO_DE_ACESSO da Vercel, como sempre entrou —
 * nada mudou para ele, nem o atalho da Siri. Quem chega por convite recebe um
 * código gerado (ver `codigos.ts`), e o banco guarda só a impressão dele:
 * HMAC com o AUTH_SECRET. Quem lesse o banco não teria o código de ninguém.
 *
 * O navegador lembra por seis meses. O cookie diz QUEM é, assinado; e para
 * quem não é o dono, cada pedido confere se a pessoa ainda existe — remover
 * alguém corta o acesso na hora, sem esperar o cookie vencer.
 */

const COOKIE = "termometro_sessao";
const DURACAO_SESSAO_MS = 1000 * 60 * 60 * 24 * 180; // 180 dias

/** O id do dono. Os dados de antes das contas são todos dele. */
export const DONO = "dono";

export interface Sessao {
  usuarioId: string;
  ehDono: boolean;
}

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

/** O código é o do dono? Em tempo constante, como sempre foi. */
function ehCodigoDoDono(codigo: string): boolean {
  if (!codigoConfigurado()) return false;
  return iguais((process.env.CODIGO_DE_ACESSO ?? "").trim(), codigo.trim());
}

/**
 * A impressão do código, que é o que o banco guarda. Determinística de
 * propósito — é por ela que se acha a pessoa —, e inútil sem o AUTH_SECRET.
 */
export function impressaoDoCodigo(codigo: string): string {
  return createHmac("sha256", segredo())
    .update(`codigo:${normalizarCodigo(codigo)}`)
    .digest("hex");
}

/**
 * De quem é este código? É a porta da tela de entrada E a do atalho da Siri,
 * que chega sem cookie, só com o código num cabeçalho.
 */
export async function usuarioDoCodigo(codigo: string | null | undefined): Promise<string | null> {
  if (!codigo || !codigo.trim()) return null;
  if (ehCodigoDoDono(codigo)) return DONO;
  if (normalizarCodigo(codigo).length < 8) return null;
  const achado = await bd.usuario.findUnique({
    where: { codigoHash: impressaoDoCodigo(codigo) },
    select: { id: true },
  });
  return achado?.id ?? null;
}

/** Abre a sessão de alguém neste navegador. */
export async function abrirSessao(usuarioId: string): Promise<void> {
  const expira = Date.now() + DURACAO_SESSAO_MS;
  const carga = `${usuarioId}.${expira}`;
  const jar = await cookies();
  jar.set(COOKIE, `${carga}.${assinar(carga)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expira),
  });
}

export async function entrar(codigo: string): Promise<{ ok: boolean; motivo?: string }> {
  const usuarioId = await usuarioDoCodigo(codigo);
  if (!usuarioId) {
    if (!codigoConfigurado()) {
      return {
        ok: false,
        motivo:
          "Esta instalação está sem código de acesso configurado. " +
          "Cadastre CODIGO_DE_ACESSO na Vercel e publique de novo.",
      };
    }
    return { ok: false, motivo: "Código incorreto." };
  }
  await abrirSessao(usuarioId);
  return { ok: true };
}

export async function sair(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/**
 * Quem está aqui? `null` é ninguém.
 *
 * Dois formatos de cookie valem: o novo, `usuario.expira.assinatura`, e o de
 * antes das contas, `expira.assinatura` — que só o dono tinha, e que continua
 * sendo dele, para ninguém ser deslogado pela atualização.
 */
export async function sessao(): Promise<Sessao | null> {
  const jar = await cookies();
  const bruto = jar.get(COOKIE)?.value;
  if (!bruto) return null;

  const partes = bruto.split(".");
  let usuarioId: string;
  let expira: string;
  let assinatura: string;
  if (partes.length === 2) {
    [expira, assinatura] = partes;
    usuarioId = DONO;
    if (!iguais(assinar(expira), assinatura)) return null;
  } else if (partes.length === 3) {
    [usuarioId, expira, assinatura] = partes;
    if (!usuarioId || !iguais(assinar(`${usuarioId}.${expira}`), assinatura)) return null;
  } else {
    return null;
  }
  if (!(Number(expira) > Date.now())) return null;

  if (usuarioId !== DONO) {
    // Removido pelo dono? Então a sessão morreu junto, agora.
    const existe = await bd.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } });
    if (!existe) return null;
  }
  return { usuarioId, ehDono: usuarioId === DONO };
}

export async function temSessao(): Promise<boolean> {
  return (await sessao()) !== null;
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessao();
  if (!s) redirect("/entrar");
  return s;
}

/**
 * Quem bate na porta de trás (atalho da Siri): o código no cabeçalho ou no
 * corpo, ou a sessão do navegador, nessa ordem.
 */
export async function usuarioDoPedido(...codigos: (string | null | undefined)[]): Promise<string | null> {
  for (const c of codigos) {
    const id = await usuarioDoCodigo(c);
    if (id) return id;
  }
  return (await sessao())?.usuarioId ?? null;
}

export const NOME_DO_COOKIE = COOKIE;
