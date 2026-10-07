/**
 * Ler e escrever o formato do Gmail, sem rede: cabeçalhos, corpo em texto,
 * anexos e a montagem da mensagem (MIME) de um rascunho. Tudo puro, para poder
 * ser testado sem conta nenhuma.
 */

export interface ParteGmail {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: ParteGmail[];
}

export interface MensagemGmail {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: ParteGmail;
}

export function cabecalho(m: MensagemGmail | ParteGmail | undefined, nome: string): string {
  const p = m && "payload" in m ? m.payload : (m as ParteGmail | undefined);
  const alvo = nome.toLowerCase();
  return p?.headers?.find((h) => h.name.toLowerCase() === alvo)?.value ?? "";
}

/** "Fulano de Tal <fulano@x.com>" → { nome: "Fulano de Tal", email: "fulano@x.com" } */
export function separarEndereco(texto: string): { nome: string; email: string } {
  const m = texto.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { nome: m[1].trim() || m[2].trim(), email: m[2].trim().toLowerCase() };
  const email = texto.trim().toLowerCase();
  return { nome: email, email };
}

/** Todos os endereços de um cabeçalho To/Cc, respeitando vírgulas dentro de aspas. */
export function enderecos(texto: string): string[] {
  const partes = texto.match(/("[^"]*"|[^,])+/g) ?? [];
  return partes.map((p) => separarEndereco(p).email).filter((e) => e.includes("@"));
}

const decodificar = (data?: string) => (data ? Buffer.from(data, "base64url").toString("utf8") : "");

export function htmlParaTexto(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function acharParte(p: ParteGmail | undefined, tipo: string): ParteGmail | undefined {
  if (!p) return undefined;
  if (p.mimeType === tipo && !p.filename && p.body?.data) return p;
  for (const filha of p.parts ?? []) {
    const achada = acharParte(filha, tipo);
    if (achada) return achada;
  }
  return undefined;
}

/** O corpo em texto: o text/plain se houver; senão, o HTML limpo. */
export function corpoEmTexto(m: MensagemGmail): string {
  const plano = acharParte(m.payload, "text/plain");
  if (plano) return decodificar(plano.body?.data).replace(/\r\n/g, "\n").trim();
  const html = acharParte(m.payload, "text/html");
  if (html) return htmlParaTexto(decodificar(html.body?.data));
  return (m.snippet ?? "").trim();
}

/**
 * Corta o histórico citado no fim de uma resposta ("Em seg., 5 de out. … escreveu:",
 * "On … wrote:", linhas começadas por ">"). Sem isso cada mensagem de uma
 * conversa longa traria a conversa inteira de novo, e a triagem leria tudo
 * várias vezes.
 */
export function semCitacao(texto: string): string {
  const linhas = texto.split("\n");
  const corte = linhas.findIndex(
    (l, i) =>
      /^\s*(Em|On|Le|El|Am)\b.{0,200}(escreveu|wrote|écrit|escribió|schrieb)\s*:?\s*$/i.test(l) ||
      // O Gmail às vezes quebra o "Em … escreveu:" em duas linhas.
      (/^\s*(Em|On)\b.{0,200}$/i.test(l) && /^.{0,120}(escreveu|wrote)\s*:\s*$/i.test(linhas[i + 1] ?? "")) ||
      /^-{2,}\s*(Mensagem original|Original Message|Forwarded message|Mensagem encaminhada)/i.test(l) ||
      /^\s*(De|From):\s.+$/.test(l) && /^\s*(Enviado|Sent|Data|Date):/i.test(linhas[i + 1] ?? ""),
  );
  const util = (corte >= 0 ? linhas.slice(0, corte) : linhas).filter((l) => !/^\s*>/.test(l));
  return util.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export interface Anexo {
  mensagemId: string;
  anexoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
}

export function anexos(m: MensagemGmail): Anexo[] {
  const lista: Anexo[] = [];
  const andar = (p?: ParteGmail) => {
    if (!p) return;
    if (p.filename && p.body?.attachmentId) {
      lista.push({
        mensagemId: m.id,
        anexoId: p.body.attachmentId,
        nome: p.filename,
        tipo: p.mimeType ?? "application/octet-stream",
        tamanho: p.body.size ?? 0,
      });
    }
    p.parts?.forEach(andar);
  };
  andar(m.payload);
  return lista;
}

/** Cabeçalho com acentos, no formato que todo cliente de e-mail entende. */
function cabecalhoCodificado(texto: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(texto) ? texto : `=?UTF-8?B?${Buffer.from(texto, "utf8").toString("base64")}?=`;
}

export interface NovaMensagem {
  para: string[];
  cc?: string[];
  assunto: string;
  corpo: string;
  /** Message-ID da mensagem respondida, para o Gmail encaixar na conversa. */
  emRespostaA?: string;
  referencias?: string;
}

/** A mensagem em MIME, em base64url — o "raw" que a API de rascunhos pede. */
export function montarMime(m: NovaMensagem): string {
  const linhas = [
    `To: ${m.para.join(", ")}`,
    ...(m.cc?.length ? [`Cc: ${m.cc.join(", ")}`] : []),
    `Subject: ${cabecalhoCodificado(m.assunto)}`,
    ...(m.emRespostaA ? [`In-Reply-To: ${m.emRespostaA}`] : []),
    ...(m.emRespostaA || m.referencias
      ? [`References: ${[m.referencias, m.emRespostaA].filter(Boolean).join(" ")}`]
      : []),
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(m.corpo.replace(/\r?\n/g, "\r\n"), "utf8")
      .toString("base64")
      .replace(/.{76}/g, "$&\r\n"),
  ];
  return Buffer.from(linhas.join("\r\n"), "utf8").toString("base64url");
}

/** "Re: " uma vez só, mesmo quando o assunto já veio com "RE:" ou "Res:". */
export function assuntoDeResposta(assunto: string): string {
  return /^\s*(re|res|ref)\s*:/i.test(assunto) ? assunto : `Re: ${assunto}`;
}

/**
 * Para quem vai a resposta. "Responder a todos", como o Gmail faz: o autor da
 * última mensagem que não é você, mais os outros envolvidos em cópia — sem
 * você mesmo, e sem repetir ninguém.
 */
export function destinatariosDaResposta(
  mensagens: MensagemGmail[],
  meuEmail: string,
): { para: string[]; cc: string[] } {
  const eu = meuEmail.toLowerCase();
  const ultimaDeOutro = [...mensagens].reverse().find((m) => separarEndereco(cabecalho(m, "From")).email !== eu);
  const ultima = mensagens[mensagens.length - 1];
  if (!ultimaDeOutro) {
    // A conversa só tem mensagens suas: responde a quem você escreveu.
    return { para: enderecos(cabecalho(ultima, "To")).filter((e) => e !== eu), cc: [] };
  }
  const deQuem = separarEndereco(cabecalho(ultimaDeOutro, "Reply-To") || cabecalho(ultimaDeOutro, "From")).email;
  const outros = [...enderecos(cabecalho(ultimaDeOutro, "To")), ...enderecos(cabecalho(ultimaDeOutro, "Cc"))];
  const cc = [...new Set(outros)].filter((e) => e !== eu && e !== deQuem && !e.startsWith("undisclosed"));
  return { para: [deQuem], cc };
}
