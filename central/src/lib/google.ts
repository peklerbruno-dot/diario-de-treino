import "server-only";
import type { Conta } from "@prisma/client";
import { bd } from "./bd";
import { cifrar, decifrar } from "./cofre";
import type { MensagemGmail } from "./gmail";

/**
 * Tudo o que fala com o Google: o login de cada conta (OAuth) e as chamadas ao
 * Gmail, à Agenda e ao Drive. Chamadas REST diretas, sem a biblioteca oficial —
 * ela pesa dezenas de megabytes, e aqui se usa meia dúzia de endereços.
 */

export const ESCOPOS = [
  "openid",
  "email",
  "profile",
  // Ler, rotular e criar rascunhos. Não há envio automático em lugar nenhum
  // do código: quem aperta "enviar" é você, no Gmail.
  "https://www.googleapis.com/auth/gmail.modify",
  // Ler a agenda e pôr nela um prazo que veio por e-mail.
  "https://www.googleapis.com/auth/calendar.events",
  // Só os arquivos que a própria Central criar (os anexos que você mandar
  // salvar). O resto do seu Drive fica fora do alcance dela.
  "https://www.googleapis.com/auth/drive.file",
];

export class ContaDesconectada extends Error {
  constructor(public email: string) {
    super(`O Google recusou o acesso à conta ${email}. Reconecte em Ajustes.`);
  }
}

export class ErroDoGoogle extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

function credenciais() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const segredo = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !segredo) throw new Error("Faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET na Vercel.");
  return { id, segredo };
}

export function googleConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function urlDeConsentimento(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: credenciais().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ESCOPOS.join(" "),
    // "offline" + "consent" é o que garante um refresh token mesmo numa conta
    // que já tinha autorizado antes — sem ele a conexão morre em uma hora.
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

interface RespostaDeToken {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function pedirToken(corpo: Record<string, string>): Promise<RespostaDeToken> {
  const { id, segredo } = credenciais();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, ...corpo }),
  });
  const json = (await r.json()) as RespostaDeToken;
  if (!r.ok) {
    const e = new ErroDoGoogle(r.status, json.error_description || json.error || "Falha no token.");
    (e as ErroDoGoogle & { codigo?: string }).codigo = json.error;
    throw e;
  }
  return json;
}

/** Fim do OAuth: troca o código pelos tokens e descobre de quem é a conta. */
export async function conectarConta(code: string, redirectUri: string): Promise<Conta> {
  const t = await pedirToken({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
  const eu = (await (
    await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${t.access_token}` },
    })
  ).json()) as { email?: string };
  if (!eu.email) throw new Error("O Google não informou o e-mail da conta.");

  const faltando = ESCOPOS.filter((s) => s.startsWith("https://") && !t.scope?.includes(s));
  if (faltando.length) {
    throw new Error(
      "Algumas permissões ficaram desmarcadas na tela do Google. Conecte de novo e deixe todas marcadas.",
    );
  }

  const existente = await bd.conta.findUnique({ where: { email: eu.email } });
  const refresh = t.refresh_token ?? (existente ? decifrar(existente.refreshToken) : null);
  if (!refresh) throw new Error("O Google não devolveu um refresh token. Tente conectar de novo.");

  const dados = {
    refreshToken: cifrar(refresh),
    accessToken: cifrar(t.access_token),
    accessExpiraEm: new Date(Date.now() + t.expires_in * 1000),
    erro: null,
  };
  return bd.conta.upsert({
    where: { email: eu.email },
    update: dados,
    create: { email: eu.email, rotulo: rotuloSugerido(eu.email), ...dados },
  });
}

/** "bruno.pekler@cip.org.br" → "CIP"; "@usp.br" → "USP"; gmail → "Pessoal". */
export function rotuloSugerido(email: string): string {
  const dominio = email.split("@")[1]?.toLowerCase() ?? "";
  if (dominio === "gmail.com" || dominio === "googlemail.com") return "Pessoal";
  return dominio.split(".")[0].toUpperCase();
}

async function tokenDe(conta: Conta, forcar = false): Promise<string> {
  if (!forcar && conta.accessToken && conta.accessExpiraEm && conta.accessExpiraEm.getTime() > Date.now() + 60_000) {
    return decifrar(conta.accessToken);
  }
  let refresh: string;
  try {
    refresh = decifrar(conta.refreshToken);
  } catch {
    // Só acontece se o AUTH_SECRET mudou: o token guardado ficou ilegível.
    await bd.conta.update({ where: { id: conta.id }, data: { erro: "O acesso guardado ficou ilegível. Reconecte esta conta." } });
    throw new ContaDesconectada(conta.email);
  }
  try {
    const t = await pedirToken({ refresh_token: refresh, grant_type: "refresh_token" });
    const expira = new Date(Date.now() + t.expires_in * 1000);
    await bd.conta.update({
      where: { id: conta.id },
      data: { accessToken: cifrar(t.access_token), accessExpiraEm: expira, erro: null },
    });
    conta.accessToken = cifrar(t.access_token);
    conta.accessExpiraEm = expira;
    return t.access_token;
  } catch (e) {
    if ((e as { codigo?: string }).codigo === "invalid_grant") {
      await bd.conta.update({
        where: { id: conta.id },
        data: { erro: "O acesso expirou ou foi revogado. Reconecte esta conta." },
      });
      throw new ContaDesconectada(conta.email);
    }
    throw e;
  }
}

/** Uma chamada autenticada. Num 401, renova o token e tenta mais uma vez. */
async function chamar(conta: Conta, url: string, init: RequestInit = {}, tentativa = 0): Promise<Response> {
  const token = await tokenDe(conta, tentativa > 0);
  const r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (r.status === 401 && tentativa === 0) return chamar(conta, url, init, 1);
  if (!r.ok) {
    let msg = `${r.status}`;
    try {
      const j = (await r.json()) as { error?: { message?: string } };
      msg = j.error?.message ?? msg;
    } catch {}
    throw new ErroDoGoogle(r.status, `Google respondeu ${r.status}: ${msg}`);
  }
  return r;
}

const json = async <T>(r: Promise<Response>) => (await (await r).json()) as T;

// ——— Gmail ———

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface ThreadGmail {
  id: string;
  historyId?: string;
  messages?: MensagemGmail[];
}

export async function listarThreads(conta: Conta, q: string, max: number): Promise<string[]> {
  const p = new URLSearchParams({ q, maxResults: String(max) });
  const r = await json<{ threads?: { id: string }[] }>(chamar(conta, `${GMAIL}/threads?${p}`));
  return (r.threads ?? []).map((t) => t.id);
}

export async function lerThread(conta: Conta, id: string, formato: "full" | "metadata" = "full"): Promise<ThreadGmail> {
  const p = new URLSearchParams({ format: formato });
  if (formato === "metadata") for (const h of ["From", "To", "Cc", "Subject", "Date"]) p.append("metadataHeaders", h);
  return json<ThreadGmail>(chamar(conta, `${GMAIL}/threads/${id}?${p}`));
}

export async function listarEnviadas(conta: Conta, max: number): Promise<MensagemGmail[]> {
  const p = new URLSearchParams({ q: "in:sent", maxResults: String(max) });
  const r = await json<{ messages?: { id: string }[] }>(chamar(conta, `${GMAIL}/messages?${p}`));
  return Promise.all(
    (r.messages ?? []).map((m) => json<MensagemGmail>(chamar(conta, `${GMAIL}/messages/${m.id}?format=full`))),
  );
}

export async function criarRascunhoNoGmail(conta: Conta, threadId: string, raw: string): Promise<string> {
  const r = await json<{ id: string }>(
    chamar(conta, `${GMAIL}/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw, threadId } }),
    }),
  );
  return r.id;
}

export async function atualizarRascunhoNoGmail(conta: Conta, draftId: string, threadId: string, raw: string) {
  await chamar(conta, `${GMAIL}/drafts/${draftId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw, threadId } }),
  });
}

export async function baixarAnexo(conta: Conta, mensagemId: string, anexoId: string): Promise<Buffer> {
  const r = await json<{ data: string }>(chamar(conta, `${GMAIL}/messages/${mensagemId}/attachments/${anexoId}`));
  return Buffer.from(r.data, "base64url");
}

/** Tira da caixa de entrada (o Gmail chama de "arquivar"). */
export async function arquivarThread(conta: Conta, threadId: string) {
  await chamar(conta, `${GMAIL}/threads/${threadId}/modify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
  });
}

// ——— Agenda ———

export interface EventoGoogle {
  id: string;
  summary?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

export async function eventosEntre(conta: Conta, de: Date, ate: Date): Promise<EventoGoogle[]> {
  const p = new URLSearchParams({
    timeMin: de.toISOString(),
    timeMax: ate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const r = await json<{ items?: EventoGoogle[] }>(
    chamar(conta, `https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`),
  );
  return (r.items ?? []).filter(
    (e) => e.status !== "cancelled" && !e.attendees?.some((a) => a.self && a.responseStatus === "declined"),
  );
}

/** Um compromisso de dia inteiro, que é como um prazo de e-mail costuma ser. */
export async function criarEventoDeDiaInteiro(conta: Conta, dia: string, titulo: string, descricao: string) {
  const fim = new Date(`${dia}T12:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + 1);
  return json<EventoGoogle>(
    chamar(conta, "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: titulo,
        description: descricao,
        start: { date: dia },
        end: { date: fim.toISOString().slice(0, 10) },
      }),
    }),
  );
}

// ——— Drive ———

async function pastaNoDrive(conta: Conta, nome: string, pai?: string): Promise<string> {
  const filtro = [
    `name = '${nome.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    pai ? `'${pai}' in parents` : "'root' in parents",
  ].join(" and ");
  const achada = await json<{ files?: { id: string }[] }>(
    chamar(conta, `https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: filtro, fields: "files(id)" })}`),
  );
  if (achada.files?.[0]) return achada.files[0].id;
  const criada = await json<{ id: string }>(
    chamar(conta, "https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nome,
        mimeType: "application/vnd.google-apps.folder",
        ...(pai ? { parents: [pai] } : {}),
      }),
    }),
  );
  return criada.id;
}

/** Guarda um arquivo em "Central/<subpasta>" no Drive da conta. Devolve o link. */
export async function salvarNoDrive(
  conta: Conta,
  subpasta: string,
  nome: string,
  tipo: string,
  conteudo: Buffer,
): Promise<string> {
  const raiz = await pastaNoDrive(conta, "Central");
  const pasta = await pastaNoDrive(conta, subpasta, raiz);
  const fronteira = `central${Date.now()}`;
  const corpo = Buffer.concat([
    Buffer.from(
      `--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify({ name: nome, parents: [pasta] }) +
        `\r\n--${fronteira}\r\nContent-Type: ${tipo}\r\n\r\n`,
    ),
    conteudo,
    Buffer.from(`\r\n--${fronteira}--`),
  ]);
  const r = await json<{ webViewLink?: string; id: string }>(
    chamar(conta, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${fronteira}` },
      body: corpo,
    }),
  );
  return r.webViewLink ?? `https://drive.google.com/file/d/${r.id}/view`;
}
